export type CustomEntryIcons = Readonly<Record<string, string>>;

export function entryIcon(icons: Readonly<Record<string, string | undefined>>, name: string): string | undefined {
  return Object.hasOwn(icons, name) ? icons[name] : undefined;
}

/** Fit editable vectors, optionally applying brand paint while preserving white details. */
export async function normalizeEntryIcon(file: File, applyMainColor = false): Promise<string> {
  if (!/\.svg$/i.test(file.name) || !['', 'image/svg+xml'].includes(file.type) || file.size > 5 * 1024 ** 2) {
    throw new Error('Choose an SVG icon up to 5 MB.');
  }
  const { svgVector } = await import('../../../features/constructor/helpers/svg-vector');
  const { Color, Group } = await import('fabric');
  const source = await file.text();
  const root = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
  const viewBox = root.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  const width = Number.parseFloat(root.getAttribute('width') ?? '') || viewBox?.[2] || 24;
  const height = Number.parseFloat(root.getAttribute('height') ?? '') || viewBox?.[3] || 24;
  const scale = 96 / Math.max(width, height);
  const icon = await svgVector(source, width * scale, height * scale, applyMainColor ? '#36d4f7' : '#000000');
  if (!icon) throw new Error('Choose a vector SVG without embedded images or external resources.');
  const paint = (object: import('fabric').FabricObject): void => {
    if (object instanceof Group) object.getObjects().forEach(paint);
    for (const key of ['fill', 'stroke'] as const) {
      const color = object[key];
      if (color && color !== 'none' && (typeof color !== 'string' || (new Color(color).getAlpha() > 0 && new Color(color).toHex() !== 'FFFFFF'))) {
        object.set(key, '#36d4f7');
      }
    }
  };
  if (applyMainColor) paint(icon);
  icon.set({ left: (96 - width * scale) / 2, top: (96 - height * scale) / 2 });
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">' + icon.toSVG() + '</svg>';
  const bytes = new TextEncoder().encode(svg);
  const result = 'data:image/svg+xml;base64,' + btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
  if (result.length > 100000) throw new Error('This SVG is too complex. Choose a simpler icon.');
  return result;
}
