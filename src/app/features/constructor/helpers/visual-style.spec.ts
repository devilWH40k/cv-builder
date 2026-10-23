import { FabricImage, Textbox } from 'fabric';
import { EffectRect, EffectCircle } from './effect-shapes';
import { applyVisualStyle, captureVisualStyle } from './visual-style';
import { applyImageEffects, imageEffects } from './image-effects';

describe('Visual style transfer', () => {
  it('transfers shape appearance without geometry, identity or link changes', () => {
    const source = new EffectRect({ width: 100, height: 80, rx: 12, ry: 12, fill: '#ff0000', stroke: '#0000ff', strokeWidth: 4, opacity: 0.6 });
    source.designBlur = 8;
    const target = new EffectRect({ width: 200, height: 120, left: 300, top: 400, angle: 15, scaleX: 1.2 });
    target.designId = 'target';
    target.linkUrl = 'https://example.com/target';
    applyVisualStyle(captureVisualStyle(source), target);
    expect(target.fill).toBe('#ff0000');
    expect(target.strokeWidth).toBe(4);
    expect(target.designBlur).toBe(8);
    expect(target.rx).toBe(12);
    expect([target.width, target.height, target.left, target.top, target.angle, target.scaleX]).toEqual([200, 120, 300, 400, 15, 1.2]);
    expect(target.designId).toBe('target');
    expect(target.linkUrl).toBe('https://example.com/target');
    const circle = new EffectCircle({ radius: 50 });
    applyVisualStyle(captureVisualStyle(source), circle);
    expect(circle.designBlur).toBe(8);
    expect(circle.radius).toBe(50);
  });

  it('copies font settings without replacing content and respects locked targets', () => {
    const source = new Textbox('Source', { fontSize: 30, fontWeight: 'bold', fontStyle: 'italic', fill: '#ff0000' });
    const target = new Textbox('Target words', { width: 250, fontSize: 16 });
    applyVisualStyle(captureVisualStyle(source), target);
    expect(target.text).toBe('Target words');
    expect(target.fontSize).toBe(30);
    expect(target.fontWeight).toBe('bold');
    expect(target.width).toBe(250);
    target.set('lockMovementX', true);
    source.set('fontSize', 40);
    applyVisualStyle(captureVisualStyle(source), target);
    expect(target.fontSize).toBe(30);
  });

  it('copies image filters without replacing the image or its dimensions', () => {
    const raster = document.createElement('canvas'); raster.width = raster.height = 10;
    const source = new FabricImage(raster);
    const target = new FabricImage(raster, { width: 5, height: 7 });
    applyImageEffects(source, { grayscale: true, brightness: 20 });
    applyVisualStyle(captureVisualStyle(source), target);
    expect(imageEffects(target).grayscale).toBeTrue();
    expect(imageEffects(target).brightness).toBeCloseTo(20);
    expect([target.width, target.height]).toEqual([5, 7]);
  });
});
