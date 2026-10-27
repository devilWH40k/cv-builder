import { FabricImage, Group, StaticCanvas } from 'fabric';
import { svgVector } from './svg-vector';
import { blankDesign } from './preview-to-design';
import { parseDesign } from './design-validation';
import { buildDesignPdf, designPdfBlob } from './design-pdf';

describe('SVG vector icons', () => {
  it('reuses vector rendering while moving and invalidates the cache when recolored', async () => {
    const icon = await svgVector('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path fill="#ff0000" d="M4 4H20V20H4Z"/></svg>', 24, 24);
    if (!(icon instanceof Group)) throw new Error('Expected vector icon');
    const path = icon.getObjects().find(object => object.type === 'path')!;
    const render = spyOn(path, '_render').and.callThrough();
    const canvas = new StaticCanvas(undefined, { width: 64, height: 64, enableRetinaScaling: false, renderOnAddRemove: false });
    try {
      canvas.add(icon);
      icon.set({ left: 10, top: 10 });
      canvas.renderAll();
      expect(render).toHaveBeenCalledTimes(1);
      icon.set('left', 20);
      canvas.renderAll();
      expect(render).toHaveBeenCalledTimes(1);
      path.set('fill', '#0000ff');
      canvas.renderAll();
      expect(render).toHaveBeenCalledTimes(2);
      expect(Array.from(canvas.getContext().getImageData(32, 22, 1, 1).data)).toEqual([0, 0, 255, 255]);
    } finally { await canvas.dispose(); }
  });

  it('preserves viewport padding, colors and paths through enlargement, saving and PDF export', async () => {
    const icon = await svgVector(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 4h16v16H4z"/><circle cx="12" cy="12" r="3" fill="#ff0000"/></svg>`, 24, 24, '#36d4f7');
    expect(icon instanceof Group).toBeTrue();
    expect(icon!.width).toBeCloseTo(24);
    expect(icon!.height).toBeCloseTo(24);
    icon!.set({ left: 40, top: 60, scaleX: 20, scaleY: 20 });
    icon!.linkUrl = 'https://example.com/vector';
    const blank = blankDesign();
    const design = parseDesign({ ...blank, pages: [{ ...blank.pages[0], scene: JSON.stringify({ objects: [icon!.toObject()] }) }] });
    const canvas = new StaticCanvas(undefined);
    try {
      await canvas.loadFromJSON(design.pages[0].scene);
      const reopened = canvas.getObjects()[0];
      expect(reopened instanceof Group).toBeTrue();
      expect(reopened.objectCaching).toBeTrue();
      if (reopened instanceof Group) expect(reopened.getObjects().some((object) => object instanceof FabricImage)).toBeFalse();
      const svg = JSON.stringify((await buildDesignPdf(design)).content);
      expect(svg).toContain('<path');
      expect(svg).toContain('<circle');
      expect(svg).not.toContain('<image');
      expect(svg).toContain('54,212,247');
      const pdf = new TextDecoder('latin1').decode(await (await designPdfBlob(design)).arrayBuffer());
      expect(pdf).toContain('https://example.com/vector');
      expect(pdf).not.toContain('/Subtype /Image');
    } finally { await canvas.dispose(); }
  });

  it('rejects external references and leaves bitmap-containing SVGs for raster fallback', async () => {
    expect(await svgVector('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/a.png"/></svg>', 24, 24)).toBeNull();
    expect(await svgVector('<svg xmlns="http://www.w3.org/2000/svg"><use href="https://example.com/a.svg#icon"/></svg>', 24, 24)).toBeNull();
    expect(await svgVector('<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(https://example.com/fill.svg)" d="M0 0h24v24z"/></svg>', 24, 24)).toBeNull();
  });
});
