import { Group, StaticCanvas } from 'fabric';
import { svgVector } from './svg-vector';

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



  it('rejects external references and leaves bitmap-containing SVGs for raster fallback', async () => {
    expect(await svgVector('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/a.png"/></svg>', 24, 24)).toBeNull();
    expect(await svgVector('<svg xmlns="http://www.w3.org/2000/svg"><use href="https://example.com/a.svg#icon"/></svg>', 24, 24)).toBeNull();
    expect(await svgVector('<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(https://example.com/fill.svg)" d="M0 0h24v24z"/></svg>', 24, 24)).toBeNull();
  });
});
