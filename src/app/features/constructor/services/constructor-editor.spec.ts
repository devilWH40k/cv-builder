import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ConstructorEditor } from './constructor-editor';
import { blankDesign } from '../helpers/preview-to-design';
import { parseDesign } from '../helpers/design-validation';
import { loadDesignFonts } from '../helpers/design-assets';
import { ActiveSelection, Canvas, FabricImage, Group, IText, Point, Transform, util } from 'fabric';
import { A4_WIDTH } from '../interfaces/constructor-document';
import { svgVector } from '../helpers/svg-vector';

describe('Constructor editing', () => {
  let editor: ConstructorEditor;
  let canvas: HTMLCanvasElement;
  let changed: jasmine.Spy;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ConstructorEditor],
    });
    await loadDesignFonts();
    editor = TestBed.inject(ConstructorEditor);
    canvas = document.createElement('canvas');
    document.body.append(canvas);
    changed = jasmine.createSpy('changed');
    editor.attach(canvas, changed);
    await editor.load(blankDesign().pages[0]);
  });
  afterEach(async () => {
    await editor.dispose();
    canvas.remove();
  });

  it('renames text layers without changing their content and ignores empty or unchanged names', async () => {
    const activate = spyOn(Canvas.prototype, 'setActiveObject').and.callThrough();
    editor.addText();
    const text = activate.calls.mostRecent().args[0];
    if (!(text instanceof IText)) throw new Error('Expected text');
    const id = editor.layers()[0].id;
    const before = editor.snapshot();
    editor.renameLayer(id, '  Profile summary  ');
    expect(editor.layers()[0].label).toBe('Profile summary');
    expect(editor.selection()?.label).toBe('Profile summary');
    expect(text.text).toBe('Your text');
    const renamed = editor.snapshot();
    const history = editor.undoCount().length;
    for (const name of ['', '   ', 'Profile summary']) editor.renameLayer(id, name);
    expect(editor.snapshot()).toBe(renamed);
    expect(editor.undoCount().length).toBe(history);
    await editor.undo();
    expect(editor.snapshot()).toBe(before);
    await editor.redo();
    expect(editor.snapshot()).toBe(renamed);
    await editor.load({ id: crypto.randomUUID(), scene: renamed });
    expect(editor.layers()[0].label).toBe('Profile summary');
  });

  it('preserves group and nested member names through copying and portable designs', async () => {
    editor.addText();
    const textId = editor.layers()[0].id;
    editor.addShape('line');
    const lineId = editor.layers()[0].id;
    editor.selectAll();
    editor.group();
    const groupId = editor.layers()[0].id;
    editor.renameLayer(groupId, 'Contact details');
    editor.renameLayer(textId, 'Email');
    editor.renameLayer(lineId, 'Divider');
    expect(editor.layers()[0].children?.find((child) => child.id === lineId)?.kind).toBe('line');
    await editor.duplicate();
    const blank = blankDesign();
    const saved = parseDesign({ ...blank, pages: [{ ...blank.pages[0], scene: editor.snapshot() }] });
    await editor.load(saved.pages[0]);
    expect(editor.layers().length).toBe(2);
    for (const group of editor.layers()) {
      expect(group.label).toBe('Contact details');
      expect(group.children?.map((child) => child.label)).toEqual(['Divider', 'Email']);
    }
  });

  it('groups, moves, reopens and ungroups elements without changing their world transforms', async () => {
    editor.addText();
    editor.nudge(70, 40);
    editor.addShape('rectangle');
    const activate = spyOn(Canvas.prototype, 'setActiveObject').and.callThrough();
    editor.selectAll();
    const selection = activate.calls.mostRecent().args[0];
    if (!(selection instanceof ActiveSelection)) throw new Error('Expected multi-selection');
    const matrices = selection.getObjects().map((object) => object.calcTransformMatrix());
    const before = editor.snapshot();
    editor.group();
    expect(editor.layers().length).toBe(1);
    expect(editor.layers()[0].children?.length).toBe(2);
    const group = activate.calls.mostRecent().args[0];
    if (!(group instanceof Group)) throw new Error('Expected group');
    group.getObjects().forEach((object, index) => object.calcTransformMatrix().forEach((coordinate, axis) =>
      expect(coordinate).toBeCloseTo(matrices[index][axis], 6)));
    const grouped = editor.snapshot();
    await editor.undo();
    expect(editor.snapshot()).toBe(before);
    await editor.redo();
    expect(editor.snapshot()).toBe(grouped);
    editor.select(editor.layers()[0].id);
    editor.nudge(20, -10);
    const saved = { ...blankDesign().pages[0], scene: editor.snapshot() };
    await editor.load(saved);
    editor.select(editor.layers()[0].id);
    editor.ungroup();
    expect(editor.layers().length).toBe(2);
    expect(editor.selectionCount()).toBe(2);
    const released = activate.calls.mostRecent().args[0];
    if (!(released instanceof ActiveSelection)) throw new Error('Expected released objects');
    released.getObjects().forEach((object, index) => {
      const matrix = object.calcTransformMatrix();
      expect(matrix[4]).toBeCloseTo(matrices[index][4] + 20, 6);
      expect(matrix[5]).toBeCloseTo(matrices[index][5] - 10, 6);
    });
  });

  it('selects and edits a group member by double click and preserves unique IDs on duplication', async () => {
    editor.addText();
    editor.addShape('rectangle');
    const activate = spyOn(Canvas.prototype, 'setActiveObject').and.callThrough();
    editor.selectAll();
    editor.group();
    const group = activate.calls.mostRecent().args[0];
    if (!(group instanceof Group) || !(group.canvas instanceof Canvas)) throw new Error('Expected group');
    const text = group.getObjects().find((object): object is IText => object instanceof IText)!;
    group.canvas.fire('mouse:dblclick', { e: new MouseEvent('dblclick'), target: group, subTargets: [text],
      scenePoint: new Point(), viewportPoint: new Point() });
    expect(editor.selection()?.id).toBe(text.designId);
    expect(text.isEditing).toBeTrue();
    editor.finishEditing();
    editor.updateText({ fontSize: 30 });
    expect(text.fontSize).toBe(30);
    expect(editor.layers()[0].children?.find((child) => child.id === text.designId)?.fontSize).toBe(30);
    editor.select(group.designId!);
    await editor.duplicate();
    const ids = editor.layers().flatMap((layer) => [layer.id, ...layer.children!.map((child) => child.id)]);
    expect(new Set(ids).size).toBe(6);
    expect(editor.layers().length).toBe(2);
  });

  for (const textMember of [false, true]) {
    it(`drills into nested groups one level per double-click before selecting ${textMember ? 'and editing text' : 'a shape'}`, () => {
      if (textMember) editor.addText();
      else editor.addShape('rectangle');
      const activate = spyOn(Canvas.prototype, 'setActiveObject').and.callThrough();
      editor.select(editor.layers()[0].id);
      const member = activate.calls.mostRecent().args[0];
      const groups: Group[] = [];
      for (let depth = 0; depth < 3; depth++) {
        editor.addShape('circle');
        editor.nudge(300 + depth * 40, 300 + depth * 40);
        editor.selectAll();
        editor.group();
        const group = activate.calls.mostRecent().args[0];
        if (!(group instanceof Group)) throw new Error('Expected group');
        groups.push(group);
      }
      const liveCanvas = groups[2].canvas;
      if (!(liveCanvas instanceof Canvas)) throw new Error('Expected live canvas');
      const before = editor.snapshot();
      const history = editor.undoCount().length;
      const doubleClick = () => {
        const upper = liveCanvas.upperCanvasEl;
        const point = member.getCenterPoint().transform(liveCanvas.viewportTransform);
        const bounds = upper.getBoundingClientRect();
        const options = { clientX: bounds.left + point.x, clientY: bounds.top + point.y,
          bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true };
        for (const detail of [1, 2]) {
          upper.dispatchEvent(new PointerEvent('pointerdown', { ...options, detail, buttons: 1 }));
          upper.dispatchEvent(new PointerEvent('pointerup', { ...options, detail, buttons: 0 }));
        }
        upper.dispatchEvent(new MouseEvent('dblclick', { ...options, detail: 2 }));
      };
      for (const group of groups.slice(0, -1).reverse()) {
        doubleClick();
        expect(editor.selection()?.id).toBe(group.designId);
        expect(editor.selectionCount()).toBe(1);
        if (member instanceof IText) expect(member.isEditing).toBeFalse();
      }
      doubleClick();
      expect(editor.selection()?.id).toBe(member.designId);
      if (member instanceof IText) expect(member.isEditing).toBeTrue();
      expect(editor.snapshot()).toBe(before);
      expect(editor.undoCount().length).toBe(history);
    });
  }

  for (const nested of [false, true]) {
    it(`keeps adding and removing members with Shift-click inside ${nested ? 'nested groups' : 'a group'}`, () => {
      for (let index = 0; index < 4; index++) {
        editor.addShape('rectangle');
        editor.nudge((index % 3) * 210, Math.floor(index / 3) * 200);
      }
      const activate = spyOn(Canvas.prototype, 'setActiveObject').and.callThrough();
      editor.selectAll();
      editor.group();
      const group = activate.calls.mostRecent().args[0];
      if (!(group instanceof Group) || !(group.canvas instanceof Canvas)) throw new Error('Expected group');
      const liveCanvas = group.canvas;
      const members = group.getObjects();
      const matrices = members.map((member) => member.calcTransformMatrix());
      if (nested) {
        editor.addShape('circle');
        editor.nudge(500, 500);
        editor.selectAll();
        editor.group();
      }
      editor.select(members[0].designId!);
      const shiftClick = (member: typeof members[number]) => {
        const point = member.getCenterPoint().transform(liveCanvas.viewportTransform);
        const upper = liveCanvas.upperCanvasEl;
        const bounds = upper.getBoundingClientRect();
        const options = { clientX: bounds.left + point.x, clientY: bounds.top + point.y,
          shiftKey: true, bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true };
        upper.dispatchEvent(new PointerEvent('pointerdown', { ...options, buttons: 1 }));
        upper.dispatchEvent(new PointerEvent('pointerup', { ...options, buttons: 0 }));
      };
      for (let index = 1; index < members.length; index++) {
        shiftClick(members[index]);
        expect(editor.selectionCount()).toBe(index + 1);
        expect(editor.selectedIds()).toEqual(new Set(members.slice(0, index + 1).map((member) => member.designId!)));
      }
      shiftClick(members[1]);
      expect(editor.selectionCount()).toBe(3);
      expect(editor.selectedIds().has(members[1].designId!)).toBeFalse();
      expect(editor.canGroup()).toBeFalse();
      expect(editor.canUngroup()).toBeFalse();
      editor.select(group.designId!);
      expect(group.interactive).toBeFalse();
      expect(group.getObjects()).toEqual(members);
      members.forEach((member, index) => {
        expect(member.parent).toBe(group);
        member.calcTransformMatrix().forEach((coordinate, axis) =>
          expect(coordinate).toBeCloseTo(matrices[index][axis], 6));
      });
    });
  }

  it('numbers groups in creation order, retaining the sequence after ungrouping and reopening', async () => {
    editor.addText();
    editor.addShape('rectangle');
    editor.selectAll();
    editor.group();
    expect(editor.selection()?.label).toBe('Group 1');
    editor.addShape('circle');
    editor.selectAll();
    editor.group();
    expect(editor.selection()?.label).toBe('Group 2');
    editor.ungroup();
    editor.selectAll();
    editor.group();
    expect(editor.selection()?.label).toBe('Group 3');
    const saved = { id: crypto.randomUUID(), scene: editor.snapshot() };
    await editor.load(saved);
    editor.addShape('rectangle');
    editor.selectAll();
    editor.group();
    expect(editor.selection()?.label).toBe('Group 4');
    await editor.undo();
    await editor.redo();
    expect(editor.layers()[0].label).toBe('Group 4');
  });

  it('hides SVG paths and shapes while keeping the artwork selectable inside user groups', async () => {
    const artwork = await svgVector(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M0 0h10v10z"/><circle cx="16" cy="16" r="4"/></svg>',
      24, 24,
    );
    if (!(artwork instanceof Group)) throw new Error('Expected vector artwork');
    artwork.designLabel = 'SVG icon';
    await editor.load({ id: crypto.randomUUID(), scene: JSON.stringify({ objects: [artwork.toObject()] }) });
    expect(editor.layers()[0].label).toBe('SVG icon');
    expect(editor.layers()[0].children).toBeUndefined();
    editor.addText();
    const activate = spyOn(Canvas.prototype, 'setActiveObject').and.callThrough();
    editor.selectAll();
    editor.group();
    const group = activate.calls.mostRecent().args[0];
    if (!(group instanceof Group) || !(group.canvas instanceof Canvas)) throw new Error('Expected user group');
    const svg = group.getObjects().find((member) => member.designLabel === 'SVG icon')!;
    expect(editor.layers()[0].children?.length).toBe(2);
    expect(editor.layers()[0].children?.find((member) => member.label === 'SVG icon')?.children).toBeUndefined();
    group.canvas.fire('mouse:dblclick', { e: new MouseEvent('dblclick'), target: group, subTargets: [svg],
      scenePoint: new Point(), viewportPoint: new Point() });
    expect(editor.selection()?.id).toBe(svg.designId);
    const saved = { id: crypto.randomUUID(), scene: editor.snapshot() };
    await editor.load(saved);
    expect(editor.layers()[0].children?.length).toBe(2);
    expect(editor.layers()[0].children?.find((member) => member.label === 'SVG icon')?.children).toBeUndefined();
  });

  it('shows shared text properties and applies them to nested groups in one history action', async () => {
    editor.addText();
    editor.updateText({ fontSize: 18 });
    editor.addText();
    editor.updateText({ fontSize: 30, bold: true });
    editor.selectAll();
    editor.group();
    expect(editor.selection()?.isText).toBeTrue();
    expect(editor.selection()?.mixed).toContain('fontSize');
    expect(editor.selection()?.mixed).toContain('bold');
    editor.addText();
    editor.selectAll();
    editor.group();
    const before = editor.snapshot();
    const history = editor.undoCount().length;
    editor.updateText({ fontSize: 28, bold: true, italic: true, textAlign: 'center' });
    expect(editor.undoCount().length).toBe(history + 1);
    expect(editor.selection()?.fontSize).toBe(28);
    expect(editor.selection()?.bold).toBeTrue();
    expect(editor.selection()?.italic).toBeTrue();
    expect(editor.selection()?.textAlign).toBe('center');
    expect(editor.selection()?.mixed).not.toContain('fontSize');
    const after = editor.snapshot();
    await editor.undo();
    expect(editor.snapshot()).toBe(before);
    await editor.redo();
    expect(editor.snapshot()).toBe(after);
    editor.select(editor.layers()[0].id);
    editor.setFill('#123456', '#abcdef');
    editor.setLink('https://example.com/group');
    const group = editor.layers()[0];
    const texts = group.children!.flatMap((child) => child.children ?? [child]);
    expect(texts.length).toBe(3);
    for (const text of texts) {
      expect(text.fontSize).toBe(28);
      expect(text.color).toBe('#123456');
      expect(text.gradientEnd).toBe('#ABCDEF');
      expect(text.linkUrl).toBe('https://example.com/group');
    }
    await editor.load({ id: crypto.randomUUID(), scene: editor.snapshot() });
    editor.select(editor.layers()[0].id);
    expect(editor.selection()?.fontSize).toBe(28);
    expect(editor.selection()?.linkUrl).toBe('https://example.com/group');
  });

  it('applies shared shape properties while retaining locked members and group movement', () => {
    editor.addShape('rectangle');
    editor.updateRectangle({ borderWidth: 2 });
    editor.addShape('rectangle');
    editor.selectAll();
    editor.group();
    expect(editor.selection()?.isRectangle).toBeTrue();
    expect(editor.selection()?.canBlur).toBeTrue();
    expect(editor.selection()?.mixed).toContain('borderWidth');
    editor.updateRectangle({ borderRadius: 12, borderWidth: 4, borderColor: '#ff0000' });
    editor.setBlur(6);
    for (const child of editor.layers()[0].children!) {
      expect(child.borderRadius).toBe(12);
      expect(child.borderWidth).toBe(4);
      expect(child.borderColor).toBe('#FF0000');
      expect(child.blur).toBe(6);
    }
    const id = editor.layers()[0].id;
    const lockedId = editor.layers()[0].children![0].id;
    editor.select(lockedId);
    editor.toggleLock();
    editor.select(id);
    editor.setFill('#0000ff');
    expect(editor.layers()[0].children!.find((child) => child.id === lockedId)?.color).not.toBe('#0000FF');
    expect(editor.layers()[0].children!.find((child) => child.id !== lockedId)?.color).toBe('#0000FF');
    const activate = spyOn(Canvas.prototype, 'setActiveObject').and.callThrough();
    editor.select(id);
    const group = activate.calls.mostRecent().args[0];
    if (!(group instanceof Group)) throw new Error('Expected group');
    const positions = group.getObjects().map((child) => child.getXY());
    editor.nudge(20, 10);
    group.getObjects().forEach((child, index) => {
      expect(child.getXY().x).toBeCloseTo(positions[index].x + 20, 6);
      expect(child.getXY().y).toBeCloseTo(positions[index].y + 10, 6);
    });
  });

  it('shows only common controls for mixed members and shares filters between images', async () => {
    editor.addText();
    editor.addShape('rectangle');
    editor.selectAll();
    editor.group();
    expect(editor.selection()?.isText).toBeFalse();
    expect(editor.selection()?.isRectangle).toBeFalse();
    expect(editor.selection()?.canFill).toBeTrue();
    editor.setFill('#ff0000');
    expect(editor.layers()[0].children!.every((child) => child.color === '#FF0000')).toBeTrue();
    const raster = document.createElement('canvas');
    raster.width = raster.height = 10;
    const images = new Group([new FabricImage(raster), new FabricImage(raster)], { subTargetCheck: true });
    await editor.load({ id: crypto.randomUUID(), scene: JSON.stringify({ objects: [images.toObject()] }) });
    editor.select(editor.layers()[0].id);
    expect(editor.selection()?.isImage).toBeTrue();
    expect(editor.selection()?.canFill).toBeFalse();
    editor.updateImageEffects({ brightness: 20, contrast: 10, grayscale: true });
    expect(editor.layers()[0].children!.every((child) => child.imageEffects.brightness === 20 && child.imageEffects.grayscale)).toBeTrue();
    expect(editor.selection()?.imageEffects.contrast).toBe(10);
  });

  it('does not group locked selections and supports nested groups', () => {
    editor.addText();
    editor.toggleLock();
    editor.addShape('rectangle');
    editor.selectAll();
    expect(editor.canGroup()).toBeFalse();
    editor.group();
    expect(editor.layers().length).toBe(2);
    editor.select(editor.layers().find((layer) => layer.locked)!.id);
    editor.toggleLock();
    editor.selectAll();
    editor.group();
    editor.addShape('circle');
    editor.selectAll();
    editor.group();
    expect(editor.layers()[0].children?.some((child) => child.children?.length === 2)).toBeTrue();
    editor.ungroup();
    expect(editor.layers().length).toBe(2);
    expect(editor.layers().some((layer) => layer.children?.length === 2)).toBeTrue();
  });

  for (const persistentGroup of [false, true]) {
    it(`reflows texts during a ${persistentGroup ? 'persistent group' : 'multi-selection'} resize and records one undoable change`, async () => {
      editor.addText();
      editor.addText();
      editor.nudge(100, 100);
      const before = editor.snapshot();
      const activate = spyOn(Canvas.prototype, 'setActiveObject').and.callThrough();
      editor.selectAll();
      if (persistentGroup) editor.group();
      const selection = activate.calls.mostRecent().args[0];
      if (!(selection instanceof Group) || !(selection.canvas instanceof Canvas))
        throw new Error('Expected canvas group');
      const beforeResize = editor.snapshot();
      const canvas = selection.canvas;
      const matrices = selection.getObjects().map((text) => text.calcTransformMatrix());
      const transform: Transform = {
        target: selection, action: 'scale', corner: 'br',
        scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, offsetX: 0, offsetY: 0,
        originX: 'left', originY: 'top', ex: 0, ey: 0, lastX: 0, lastY: 0,
        theta: 0, width: selection.width, height: selection.height,
        shiftKey: false, altKey: false, actionPerformed: false,
        original: { ...util.saveObjectTransform(selection), originX: selection.originX, originY: selection.originY, cropX: 0, cropY: 0 },
      };
      const e = new MouseEvent('mousemove', { altKey: true });
      canvas.fire('before:transform', { e, transform });
      selection.set({ scaleX: 1.5, scaleY: 2 });
      canvas.fire('object:scaling', { e, transform, target: selection, pointer: new Point() });
      selection.getObjects().forEach((text, index) => {
        text.calcTransformMatrix().slice(0, 4).forEach((value, coordinate) =>
          expect(value).toBeCloseTo(matrices[index][coordinate], 6));
      });
      canvas.fire('object:modified', { e, transform, target: selection });
      expect(editor.selectionCount()).toBe(persistentGroup ? 1 : 2);
      const after = editor.snapshot();
      expect(after).not.toBe(before);
      await editor.undo();
      expect(editor.snapshot()).toBe(persistentGroup ? beforeResize : before);
      await editor.redo();
      expect(editor.snapshot()).toBe(after);
    });
  }

  it('restores text formatting, gradients and links through save/reopen and undo/redo', async () => {
    editor.addText();
    editor.updateText({ fontSize: 32, bold: true, textAlign: 'center' });
    editor.setFill('#ff0000', '#0000ff');
    editor.setLink('https://example.com/profile');
    expect(editor.selection()?.gradientEnd).toBe('#0000FF');
    expect(editor.selection()?.fontSize).toBe(32);
    const design = blankDesign();
    const saved = parseDesign({
      ...design,
      pages: [{ ...design.pages[0], scene: editor.snapshot() }],
    });
    await editor.load(saved.pages[0]);
    editor.select(editor.layers()[0].id);
    expect(editor.selection()?.bold).toBeTrue();
    expect(editor.selection()?.linkUrl).toBe('https://example.com/profile');
    editor.remove();
    expect(editor.layers().length).toBe(0);
    await editor.undo();
    expect(editor.layers().length).toBe(1);
    await editor.redo();
    expect(editor.layers().length).toBe(0);
    expect(changed).toHaveBeenCalled();
  });

  it('locks objects against movement, formatting and deletion', () => {
    editor.addText();
    editor.toggleLock();
    const locked = editor.snapshot();
    editor.nudge(10, 10);
    editor.updateText({ fontSize: 40 });
    editor.remove();
    expect(editor.snapshot()).toBe(locked);
    editor.toggleLock();
    editor.remove();
    expect(editor.layers().length).toBe(0);
  });

  it('moves the selection box with repeated arrow nudges in page coordinates', () => {
    editor.addText();
    editor.addShape('rectangle');
    const activate = spyOn(Canvas.prototype, 'setActiveObject').and.callThrough();
    editor.selectAll();
    const selection = activate.calls.mostRecent().args[0];
    if (!(selection instanceof ActiveSelection)) throw new Error('Expected multi-selection');
    selection.set({ angle: 30, scaleX: 1.4, scaleY: 0.8 });
    selection.setCoords();
    const bounds = selection.getBoundingRect();
    const positions = selection.getObjects().map((object) => object.getXY());
    const selectedIds = [...editor.selectedIds()];
    editor.nudge(10, 0);
    editor.nudge(0, -1);
    editor.nudge(-1, 0);
    const moved = selection.getBoundingRect();
    expect(moved.left).toBeCloseTo(bounds.left + 9, 6);
    expect(moved.top).toBeCloseTo(bounds.top - 1, 6);
    expect(moved.width).toBeCloseTo(bounds.width, 6);
    expect(moved.height).toBeCloseTo(bounds.height, 6);
    selection.getObjects().forEach((object, index) => {
      expect(object.getXY().x).toBeCloseTo(positions[index].x + 9, 6);
      expect(object.getXY().y).toBeCloseTo(positions[index].y - 1, 6);
    });
    expect([...editor.selectedIds()]).toEqual(selectedIds);
  });

  it('fits the selection box after page alignment and preserves alignment through undo', async () => {
    editor.addText();
    editor.nudge(150, 60);
    editor.addShape('rectangle');
    const activate = spyOn(Canvas.prototype, 'setActiveObject').and.callThrough();
    editor.selectAll();
    const selection = activate.calls.mostRecent().args[0];
    if (!(selection instanceof ActiveSelection)) throw new Error('Expected multi-selection');
    for (const alignment of ['left', 'center', 'right'] as const) {
      editor.align(alignment);
      const bounds = selection.getBoundingRect();
      const objects = selection.getObjects().map((object) => object.getBoundingRect());
      expect(bounds.left).toBeCloseTo(Math.min(...objects.map((object) => object.left)), 6);
      expect(bounds.left + bounds.width).toBeCloseTo(Math.max(...objects.map((object) => object.left + object.width)), 6);
      for (const object of objects) {
        const expected = alignment === 'left' ? 32 : alignment === 'center'
          ? (A4_WIDTH - object.width) / 2 : A4_WIDTH - object.width - 32;
        expect(object.left).toBeCloseTo(expected, 6);
      }
      expect(editor.selectionCount()).toBe(2);
    }
    const aligned = editor.snapshot();
    await editor.undo();
    expect(editor.snapshot()).not.toBe(aligned);
    await editor.redo();
    expect(editor.snapshot()).toBe(aligned);
  });

  it('paints a captured style onto the next layer in a single undo step', async () => {
    editor.addShape('rectangle');
    editor.setFill('#ff0000');
    editor.setBlur(8);
    const source = editor.selection()!.id;
    editor.addShape('circle');
    const target = editor.selection()!.id;
    editor.select(source);
    editor.setTool('style');
    expect(editor.tool()).toBe('style');
    editor.select(target);
    expect(editor.tool()).toBe('select');
    expect(editor.selection()?.color).toBe('#FF0000');
    expect(editor.selection()?.blur).toBe(8);
    await editor.undo();
    editor.select(target);
    expect(editor.selection()?.color).toBe('#36D4F7');
    expect(editor.selection()?.blur).toBe(0);
  });

  it('copies and cuts multiple objects across pages with distinct identities and one-step undo', async () => {
    editor.addText();
    editor.setLink('https://example.com/copied');
    editor.addShape('rectangle');
    editor.updateRectangle({ borderRadius: 10, borderWidth: 3 });
    const original = editor.snapshot();
    const originalIds = editor.layers().map((layer) => layer.id);
    editor.selectAll();
    expect(editor.selectionCount()).toBe(2);
    expect([...editor.selectedIds()].sort()).toEqual([...originalIds].sort());
    await editor.copy();
    expect(editor.snapshot()).toBe(original);
    await editor.paste();
    expect(editor.layers().length).toBe(4);
    expect(editor.selectionCount()).toBe(2);
    expect(new Set(editor.layers().map((layer) => layer.id)).size).toBe(4);
    const copies = editor.layers().filter((layer) => !originalIds.includes(layer.id));
    expect(copies.some((layer) => layer.linkUrl === 'https://example.com/copied')).toBeTrue();
    expect(copies.some((layer) => layer.borderRadius === 10)).toBeTrue();
    await editor.undo();
    expect(editor.layers().length).toBe(2);
    editor.selectAll();
    await editor.cut();
    expect(editor.layers().length).toBe(0);
    expect(editor.selectedIds().size).toBe(0);
    await editor.undo();
    expect(editor.layers().length).toBe(2);
    await editor.load(blankDesign().pages[0]);
    await editor.paste();
    expect(editor.selectionCount()).toBe(2);
    expect(editor.layers().length).toBe(2);
    const pastedIds = editor.layers().map((layer) => layer.id);
    expect(pastedIds.every((id) => !originalIds.includes(id))).toBeTrue();
    await editor.paste();
    expect(editor.layers().length).toBe(4);
    await editor.undo();
    expect(editor.layers().length).toBe(2);
  });

  it('copies locked objects but does not cut a selection containing them', async () => {
    editor.addText();
    editor.toggleLock();
    editor.addShape('circle');
    editor.selectAll();
    expect(editor.canCut()).toBeFalse();
    await editor.cut();
    expect(editor.layers().length).toBe(2);
    await editor.copy();
    expect(editor.canPaste()).toBeTrue();
    await editor.paste();
    expect(editor.layers().length).toBe(4);
  });

  it('changes layer order one level or all the way while preserving multi-selection order', async () => {
    editor.addText();
    const first = editor.selection()!.id;
    editor.addShape('rectangle');
    const second = editor.selection()!.id;
    editor.addShape('circle');
    const third = editor.selection()!.id;
    const order = () => editor.layers().map((layer) => layer.id).reverse();
    editor.select(first);
    editor.reorder('front');
    expect(order()).toEqual([second, third, first]);
    editor.reorder('backward');
    expect(order()).toEqual([second, first, third]);
    editor.reorder('back');
    expect(order()).toEqual([first, second, third]);
    editor.reorder('forward');
    expect(order()).toEqual([second, first, third]);
    editor.selectAll();
    editor.reorder('forward');
    expect(order()).toEqual([second, first, third]);
    editor.reorder('backward');
    expect(order()).toEqual([second, first, third]);
    await editor.copy();
    await editor.paste();
    const before = order();
    const copies = before.slice(3);
    editor.reorder('back');
    expect(order()).toEqual([...copies, ...before.slice(0, 3)]);
    editor.reorder('front');
    expect(order()).toEqual(before);
    await editor.undo();
    expect(order()).toEqual([...copies, ...before.slice(0, 3)]);
  });

  it('edits rectangle borders, preserves them on reopen and supports undo and locks', async () => {
    editor.addShape('rectangle');
    expect(editor.selection()?.kind).toBe('rectangle');
    editor.updateRectangle({ borderRadius: 12, borderColor: '#ff0000', borderWidth: 4 });
    editor.setBlur(6);
    expect(editor.selection()?.blur).toBe(6);
    expect(editor.selection()?.borderRadius).toBe(12);
    expect(editor.selection()?.borderColor).toBe('#FF0000');
    expect(editor.selection()?.borderWidth).toBe(4);
    const design = blankDesign();
    const page = { ...design.pages[0], scene: editor.snapshot() };
    editor.updateRectangle({ borderRadius: 20 });
    await editor.undo();
    expect(editor.selection()).toBeNull();
    editor.select(editor.layers()[0].id);
    expect(editor.selection()?.borderRadius).toBe(12);
    editor.toggleLock();
    editor.setBlur(20);
    expect(editor.selection()?.blur).toBe(6);
    editor.updateRectangle({ borderWidth: 10 });
    expect(editor.selection()?.borderWidth).toBe(4);
    await editor.load(page);
    editor.select(editor.layers()[0].id);
    expect(editor.selection()?.borderRadius).toBe(12);
    expect(editor.selection()?.borderColor).toBe('#FF0000');
    expect(editor.selection()?.blur).toBe(6);
    editor.updateRectangle({ borderWidth: 0 });
    expect(editor.selection()?.borderWidth).toBe(0);
    editor.addText();
    expect(editor.selection()?.kind).toBe('text');
    const scene = editor.snapshot();
    editor.updateRectangle({ borderWidth: 20 });
    expect(editor.snapshot()).toBe(scene);
    editor.addShape('circle');
    expect(editor.selection()?.kind).toBe('circle');
    editor.addShape('line');
    expect(editor.selection()?.kind).toBe('line');
  });

  it('preserves page backgrounds through history and reopening without adding object layers', async () => {
    editor.setBackgroundColor('#123456');
    const imageCanvas = document.createElement('canvas');
    imageCanvas.width = 20;
    imageCanvas.height = 10;
    imageCanvas.getContext('2d')!.fillRect(0, 0, 20, 10);
    const blob = await new Promise<Blob>((resolve) => imageCanvas.toBlob((blob) => resolve(blob!)));
    await editor.setBackgroundImage(new File([blob], 'background.png', { type: 'image/png' }));
    expect(editor.hasBackgroundImage()).toBeTrue();
    expect(editor.layers().length).toBe(0);
    const design = blankDesign();
    const saved = parseDesign({ ...design, pages: [{ ...design.pages[0], scene: editor.snapshot() }] });
    editor.removeBackgroundImage();
    expect(editor.hasBackgroundImage()).toBeFalse();
    await editor.undo();
    expect(editor.hasBackgroundImage()).toBeTrue();
    await editor.redo();
    expect(editor.hasBackgroundImage()).toBeFalse();
    await editor.load(saved.pages[0]);
    expect(editor.hasBackgroundImage()).toBeTrue();
    expect(editor.backgroundColor()).toBe('#123456');
    await editor.load(design.pages[0]);
    expect(editor.hasBackgroundImage()).toBeFalse();
    expect(editor.backgroundColor()).toBe('#FFFFFF');
  });

  it('duplicates with distinct identities and preserves links without depending on zoom', async () => {
    editor.addText();
    editor.setLink('mailto:alex@example.com');
    const scene = editor.snapshot();
    editor.setZoom(0.25);
    expect(editor.snapshot()).toBe(scene);
    await editor.duplicate();
    expect(new Set(editor.layers().map((layer) => layer.id)).size).toBe(2);
    expect(
      editor.layers().every((layer) => layer.linkUrl === 'mailto:alex@example.com'),
    ).toBeTrue();
  });

  it('rejects unsafe links and unsupported images without modifying the document', async () => {
    editor.addText();
    const scene = editor.snapshot();
    expect(() => editor.setLink('javascript:alert(1)')).toThrow();
    await expectAsync(
      editor.addImage(new File(['<svg />'], 'image.svg', { type: 'image/svg+xml' })),
    ).toBeRejected();
    expect(editor.snapshot()).toBe(scene);
  });

  it('allows applying gradients to imported CSS colors', async () => {
    const design = blankDesign();
    await editor.load({
      ...design.pages[0],
      scene: JSON.stringify({
        objects: [
          {
            type: 'Textbox',
            text: 'Imported text',
            fontFamily: 'Roboto',
            fill: 'rgb(54, 212, 247)',
          },
        ],
      }),
    });
    editor.select(editor.layers()[0].id);
    expect(editor.selection()?.color).toBe('#36D4F7');
    editor.setFill(editor.selection()!.color, '#0000ff');
    expect(editor.selection()?.gradientEnd).toBe('#0000FF');
  });
});
