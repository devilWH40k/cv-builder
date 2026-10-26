import { FabricImage, Group, StaticCanvas, Textbox } from 'fabric';
import { EffectCircle, EffectGroup, EffectRect, rasterEffectSvg } from './effect-shapes';
import { applyImageEffects, imageEffects } from './image-effects';
import { parseDesign } from './design-validation';
import { blankDesign } from './preview-to-design';
import { buildDesignPdf, designPdfBlob } from './design-pdf';

describe('Constructor visual effects', () => {
  it('updates blur after grouping and preserves the halo when cloning and reopening', async () => {
    const rectangle = new EffectRect({ left: 100, top: 100, width: 300, height: 300,
      originX: 'left', originY: 'top', strokeWidth: 0, fill: '#ff0000' });
    const group = new EffectGroup([new EffectGroup([rectangle])], { subTargetCheck: true });
    const canvas = new StaticCanvas(undefined, { width: 500, height: 500, enableRetinaScaling: false });
    const outsideAlpha = () => canvas.getContext().getImageData(94, 250, 1, 1).data[3];
    try {
      canvas.add(group);
      canvas.renderAll();
      expect(outsideAlpha()).toBe(0);
      rectangle.designBlur = 12;
      rectangle.set('dirty', true);
      canvas.renderAll();
      const blurred = outsideAlpha();
      expect(blurred).toBeGreaterThan(0);
      const clone = await group.clone();
      canvas.remove(group);
      canvas.add(clone);
      canvas.renderAll();
      expect(outsideAlpha()).toBe(blurred);
      await canvas.loadFromJSON({ objects: [clone.toObject()] });
      canvas.renderAll();
      expect(outsideAlpha()).toBe(blurred);
      const outer = canvas.getObjects()[0];
      if (!(outer instanceof Group)) throw new Error('Expected group');
      const inner = outer.getObjects()[0];
      if (!(inner instanceof Group)) throw new Error('Expected nested group');
      const reopened = inner.getObjects()[0];
      reopened.designBlur = 0;
      reopened.set('dirty', true);
      canvas.renderAll();
      expect(outsideAlpha()).toBe(0);
    } finally { await canvas.dispose(); }
  });

  for (const shape of ['rectangle', 'circle', 'line'] as const) {
    for (const nested of [false, true]) {
      it(`keeps ${shape} blur visible outside ${nested ? 'nested group' : 'group'} bounds`, async () => {
        const object = shape === 'circle'
          ? new EffectCircle({ left: 100, top: 100, radius: 150, fill: '#ff0000', strokeWidth: 0, originX: 'left', originY: 'top' })
          : new EffectRect({ left: 100, top: 100, width: 300, height: shape === 'line' ? 3 : 300,
              fill: '#ff0000', strokeWidth: 0, originX: 'left', originY: 'top' });
        object.designBlur = 12;
        const canvas = new StaticCanvas(undefined, { width: 500, height: 500, enableRetinaScaling: false });
        const sampleY = shape === 'line' ? 101 : 250;
        try {
          canvas.add(object);
          canvas.renderAll();
          const before = canvas.getContext().getImageData(94, sampleY, 1, 1).data[3];
          expect(before).toBeGreaterThan(0);
          canvas.remove(object);
          const group = new Group([object], { subTargetCheck: true });
          const outer = nested ? new Group([group], { subTargetCheck: true }) : group;
          const scene = JSON.stringify({ objects: [outer.toObject()] });
          await canvas.loadFromJSON(scene);
          canvas.renderAll();
          const after = canvas.getContext().getImageData(94, sampleY, 1, 1).data[3];
          expect(after).toBeGreaterThan(0);
          expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
        } finally { await canvas.dispose(); }
      });
    }
  }

  it('renders a soft shape edge, reopens editable shapes and exports only effects as pixels', async () => {
    const rectangle = new EffectRect({ left: 30, top: 30, width: 80, height: 60, fill: '#ff0000' });
    rectangle.designBlur = 8;
    const circle = new EffectCircle({ left: 150, top: 30, radius: 30, fill: '#0000ff' });
    circle.designBlur = 4;
    const text = new Textbox('Selectable text', { left: 20, top: 150, fontFamily: 'Roboto' });
    const blank = blankDesign();
    const design = parseDesign({ ...blank, pages: [{ ...blank.pages[0], scene: JSON.stringify({
      objects: [rectangle.toObject(), circle.toObject(), text.toObject()],
    }) }] });
    const canvas = new StaticCanvas(undefined, { width: 300, height: 250 });
    try {
      await canvas.loadFromJSON(design.pages[0].scene);
      expect(canvas.getObjects()[0] instanceof EffectRect).toBeTrue();
      expect(canvas.getObjects()[1] instanceof EffectCircle).toBeTrue();
      canvas.renderAll();
      const alpha = canvas.getContext().getImageData(25, 50, 1, 1).data[3];
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThan(255);
      expect(rasterEffectSvg(rectangle)).toContain('data:image/png');
      const svg = JSON.stringify((await buildDesignPdf(design)).content);
      expect(svg).toContain('<image');
      expect(svg).toContain('<text');
      expect(svg).not.toContain('feGaussianBlur');
      expect((await designPdfBlob(design)).size).toBeGreaterThan(0);
    } finally { await canvas.dispose(); }
  });

  it('embeds filtered image pixels in SVG/PDF while keeping originals for reset and reopen', async () => {
    const raster = document.createElement('canvas');
    raster.width = raster.height = 24;
    const context = raster.getContext('2d')!;
    context.fillStyle = '#ff0000';
    context.fillRect(0, 0, 24, 24);
    const image = new FabricImage(raster);
    const original = image.getSrc();
    applyImageEffects(image, { brightness: 20, contrast: 10, saturation: -20, blur: 10, grayscale: true, sepia: true, invert: true });
    expect(image.getSrc()).toBe(original);
    expect(image.getSrc(true)).not.toBe(original);
    expect(image.toSVG()).toContain(image.getSrc(true));
    const blank = blankDesign();
    const design = parseDesign({ ...blank, pages: [{ ...blank.pages[0], scene: JSON.stringify({ objects: [image.toObject()] }) }] });
    const canvas = new StaticCanvas(undefined);
    try {
      await canvas.loadFromJSON(design.pages[0].scene);
      const reopened = canvas.getObjects()[0];
      expect(reopened instanceof FabricImage).toBeTrue();
      if (!(reopened instanceof FabricImage)) return;
      expect(imageEffects(reopened).grayscale).toBeTrue();
      expect(imageEffects(reopened).sepia).toBeTrue();
      expect(imageEffects(reopened).brightness).toBeCloseTo(20);
      expect((await designPdfBlob(design)).size).toBeGreaterThan(0);
      applyImageEffects(reopened, { brightness: 0, contrast: 0, saturation: 0, blur: 0, grayscale: false, sepia: false, invert: false });
      expect(reopened.getSrc(true)).toBe(original);
    } finally { await canvas.dispose(); }
  });
});
