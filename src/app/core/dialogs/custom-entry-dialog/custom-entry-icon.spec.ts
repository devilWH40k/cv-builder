import { normalizeEntryIcon } from './custom-entry-icon';
import { svgVector } from '../../../features/constructor/helpers/svg-vector';
import { Color, Group, FabricObject } from 'fabric';

describe('Custom technology SVG icons', () => {
  it('rejects raster uploads and unsafe SVG resources', async () => {
    await expectAsync(normalizeEntryIcon(new File(['png'], 'icon.png', { type: 'image/png' }))).toBeRejected();
    await expectAsync(normalizeEntryIcon(new File(['<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.com/icon.png"/></svg>'], 'icon.svg', { type: 'image/svg+xml' }))).toBeRejected();
  });

  it('preserves white lettering over a recolored background', async () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#0a66c2"/><rect x="8" y="8" width="8" height="8" fill="white"/></svg>';
    const url = await normalizeEntryIcon(new File([source], 'linkedin.svg', { type: 'image/svg+xml' }), true);
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    expect(Array.from(context.getImageData(48, 48, 1, 1).data)).toEqual([255, 255, 255, 255]);
    expect(Array.from(context.getImageData(8, 8, 1, 1).data)).toEqual([54, 212, 247, 255]);
  });

  it('retains original colors when main color is not selected', async () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#ff0000"/></svg>';
    const url = await normalizeEntryIcon(new File([source], 'red.svg', { type: 'image/svg+xml' }));
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    expect(Array.from(context.getImageData(48, 48, 1, 1).data)).toEqual([255, 0, 0, 255]);
  });

  it('keeps editable vector fills and strokes in the main color', async () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="10" height="10" fill="red"/><path d="M12 12L20 20" fill="none" stroke="blue"/></svg>';
    const url = await normalizeEntryIcon(new File([source], 'icon.svg', { type: 'image/svg+xml' }), true);
    expect(url.startsWith('data:image/svg+xml;base64,')).toBeTrue();
    const svg = atob(url.split(',')[1]);
    const vector = await svgVector(svg, 24, 24);
    expect(vector instanceof Group).toBeTrue();
    const paints: string[] = [];
    const inspect = (object: FabricObject): void => {
      if (object instanceof Group) object.getObjects().forEach(inspect);
      else for (const paint of [object.fill, object.stroke]) {
        if (typeof paint === 'string' && paint && paint !== 'none' && new Color(paint).getAlpha() > 0) paints.push(paint);
      }
    };
    inspect(vector!);
    expect(paints.length).toBeGreaterThan(1);
    expect(paints.every((paint) => new Color(paint).toHex() === '36D4F7')).toBeTrue();
  });
});
