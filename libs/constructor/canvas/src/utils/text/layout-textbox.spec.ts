import { StaticCanvas, Transform, util } from 'fabric';
import { LayoutTextbox } from './layout-textbox';

describe('Constructor text frame resizing', () => {
  it('changes height without stretching text and retains the frame on reopen', async () => {
    const text = new LayoutTextbox('A multiline\ntext block', {
      left: 100, top: 100, width: 240, fontSize: 20, originX: 'left', originY: 'top',
    });
    const original = { ...util.saveObjectTransform(text), originX: text.originX, originY: text.originY, cropX: 0, cropY: 0 };
    const transform: Transform = {
      target: text, action: 'resizing', corner: 'mb',
      scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, offsetX: 0, offsetY: 0,
      originX: 'center', originY: 'top', ex: 220, ey: 150, lastX: 220, lastY: 150,
      theta: util.degreesToRadians(0), width: text.width, height: text.height,
      shiftKey: false, altKey: false, original, actionPerformed: false,
    };
    text.controls['mb'].actionHandler(new MouseEvent('mousemove'), transform, 220, 300);
    expect(text.fontSize).toBe(20);
    expect(text.scaleX).toBe(1);
    expect(text.scaleY).toBe(1);
    expect(text.height).toBeGreaterThan(150);
    const height = text.height;
    const canvas = new StaticCanvas(undefined);
    try {
      await canvas.loadFromJSON({ objects: [text.toObject()] });
      const reopened = canvas.getObjects()[0];
      expect(reopened instanceof LayoutTextbox).toBeTrue();
      expect(reopened.height).toBeCloseTo(height);
      expect(reopened.scaleY).toBe(1);
      text.controls['mb'].actionHandler(new MouseEvent('mousemove'), transform, 220, 110);
      expect(text.height).toBeGreaterThanOrEqual(text.calcTextHeight());
    } finally { await canvas.dispose(); }
  });
});
