import { ActiveSelection, Group, Rect, StaticCanvas } from 'fabric';
import { LayoutTextbox } from './layout-textbox';
import { selectionTextResize } from './selection-text-resize';

describe('Multi-selection text frame resizing', () => {
  for (const multiSelection of [false, true]) {
    it(`preserves nested text glyphs when resizing a ${multiSelection ? 'multi-selection' : 'persistent group'}`, async () => {
      const text = new LayoutTextbox('Grouped text that wraps when narrowed', {
        width: 240, fontSize: 20, left: 40, top: 30, angle: 15,
      });
      const nested = new Group([text], { angle: 20, scaleX: 1.1, scaleY: 0.9 });
      const shape = new Rect({ left: 320, top: 200, width: 100, height: 80 });
      const GroupClass = multiSelection ? ActiveSelection : Group;
      const group: Group = new GroupClass([nested, shape], { angle: 10, scaleX: 1.2, scaleY: 0.8 });
      const original = text.calcTransformMatrix();
      const shapeMatrix = shape.calcTransformMatrix();
      const resize = selectionTextResize(group);
      group.set({ scaleX: 0.6, scaleY: 1.6 });
      resize();
      expect(text.width).toBeCloseTo(120);
      group.set({ scaleX: 0.9, scaleY: 1.2 });
      resize();
      expect(text.width).toBeCloseTo(180);
      expect(text.height).toBeGreaterThanOrEqual(text.calcTextHeight());
      expect(shape.calcTransformMatrix()).not.toEqual(shapeMatrix);
      group.triggerLayout({ deep: true });
      text.calcTransformMatrix().slice(0, 4).forEach((coordinate, axis) =>
        expect(coordinate).toBeCloseTo(original[axis], 6));
      expect(text.fontSize).toBe(20);
      const resized = text.calcTransformMatrix();
      const canvas = new StaticCanvas(undefined);
      try {
        if (multiSelection) group.removeAll();
        await canvas.loadFromJSON({ objects: multiSelection ? [nested.toObject(), shape.toObject()] : [group.toObject()] });
        const outer = canvas.getObjects()[0];
        if (!(outer instanceof Group)) throw new Error('Expected persisted group');
        const inner = multiSelection ? outer : outer.getObjects()[0];
        if (!(inner instanceof Group)) throw new Error('Expected nested group');
        const restored = inner.getObjects()[0];
        expect(restored.width).toBeCloseTo(180);
        restored.calcTransformMatrix().forEach((coordinate, axis) =>
          expect(coordinate).toBeCloseTo(resized[axis], 3));
      } finally { await canvas.dispose(); }
    });
  }

  it('reflows multiple text frames without scaling glyphs, including repeated resize updates', async () => {
    const first = new LayoutTextbox('Text that wraps into multiple lines when narrowed', { width: 240, fontSize: 20, left: 40, top: 40 });
    const second = new LayoutTextbox('Second text', { width: 200, fontSize: 16, left: 80, top: 180, angle: 15 });
    const selection = new ActiveSelection([first, second]);
    selection.set({ angle: 25, scaleX: 1.2, scaleY: 0.9 });
    const matrices = [first.calcTransformMatrix(), second.calcTransformMatrix()];
    const resize = selectionTextResize(selection);
    selection.set({ scaleX: 0.6, scaleY: 1.8 });
    resize();
    expect(first.width).toBeCloseTo(120);
    expect(second.width).toBeCloseTo(100);
    expect(first.height).toBeGreaterThanOrEqual(first.calcTextHeight());
    selection.set({ scaleX: 0.9, scaleY: 1.35 });
    resize();
    expect(first.width).toBeCloseTo(180);
    expect(second.width).toBeCloseTo(150);
    selection.triggerLayout();
    [first, second].forEach((text, index) => {
      text.calcTransformMatrix().slice(0, 4).forEach((value, coordinate) =>
        expect(value).toBeCloseTo(matrices[index][coordinate], 6));
    });
    expect(first.fontSize).toBe(20);
    expect(second.fontSize).toBe(16);
    selection.removeAll();
    const canvas = new StaticCanvas(undefined);
    try {
      await canvas.loadFromJSON({ objects: [first.toObject(), second.toObject()] });
      expect(canvas.getObjects()[0].width).toBeCloseTo(180);
      expect(canvas.getObjects()[0].height).toBeGreaterThanOrEqual(first.calcTextHeight());
    } finally { await canvas.dispose(); }
  });

  it('keeps vertical-only resizing from stretching text while other selected shapes scale', () => {
    const text = new LayoutTextbox('Two\nlines', { width: 200, fontSize: 20 });
    const rect = new Rect({ left: 250, width: 100, height: 100 });
    const selection = new ActiveSelection([text, rect]);
    const height = text.height;
    const resize = selectionTextResize(selection);
    selection.set('scaleY', 3);
    resize();
    expect(text.width).toBeCloseTo(200);
    expect(text.height).toBeCloseTo(height * 3);
    expect(text.calcTransformMatrix()[3]).toBeCloseTo(1);
    expect(rect.calcTransformMatrix()[3]).toBeCloseTo(3);
    selection.set('scaleY', 0.2);
    resize();
    expect(text.height).toBeGreaterThanOrEqual(text.calcTextHeight());
    expect(text.fontSize).toBe(20);
  });
});
