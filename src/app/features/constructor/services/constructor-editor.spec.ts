import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ConstructorEditor } from './constructor-editor';
import { blankDesign } from '../helpers/preview-to-design';
import { parseDesign } from '../helpers/design-validation';
import { loadDesignFonts } from '../helpers/design-assets';
import { ActiveSelection, Canvas } from 'fabric';
import { A4_WIDTH } from '../interfaces/constructor-document';

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
