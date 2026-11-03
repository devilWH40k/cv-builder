import { Color, FabricObject, Gradient, Group, loadSVGFromString, Rect } from 'fabric';

/** Parse vector-only SVG without allowing Fabric to fetch embedded/external resources. */
export async function svgVector(source: string, width: number, height: number, color = '#111827', invert = false): Promise<FabricObject | null> {
  if (source.length > 2 * 1024 ** 2) return null;
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = document.documentElement;
  if (root.localName !== 'svg' || document.querySelector('parsererror')) return null;
  const allowed = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
    'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'use', 'symbol', 'title', 'desc', 'style']);
  const elements = [root, ...Array.from(root.querySelectorAll('*'))];
  if (elements.length > 2000) return null;
  for (const element of elements) {
    if (!allowed.has(element.localName)) return null;
    if (element.localName === 'style') {
      const css = element.textContent ?? '';
      if (/@import/i.test(css)) return null;
      for (const match of css.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/gi)) {
        if (!match[1].startsWith('#')) return null;
      }
    }
    for (const attribute of Array.from(element.attributes)) {
      const value = attribute.value.trim();
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
      if (attribute.localName === 'href' && !value.startsWith('#')) return null;
      for (const match of value.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/gi)) {
        if (!match[1].startsWith('#')) return null;
      }
      if (value.includes('currentColor')) element.setAttribute(attribute.name, value.replace(/currentColor/g, color));
    }
  }
  root.setAttribute('color', color);
  const parsed = await loadSVGFromString(new XMLSerializer().serializeToString(root));
  const objects = parsed.objects.filter((object): object is FabricObject => object !== null);
  if (!objects.length) return null;
  const viewportWidth = Number(parsed.options['width']);
  const viewportHeight = Number(parsed.options['height']);
  if (!(viewportWidth > 0 && viewportHeight > 0)) return null;
  // Retain whitespace inside the SVG viewport instead of stretching artwork to its bounds.
  const viewport = new Rect({ left: 0, top: 0, width: viewportWidth, height: viewportHeight,
    fill: 'transparent', strokeWidth: 0, originX: 'left', originY: 'top' });
  const group = new Group([viewport, ...objects], { originX: 'left', originY: 'top' });
  group.set({ scaleX: width / viewportWidth, scaleY: height / viewportHeight });
  const invertColor = (value: string): string => {
    const [red, green, blue, alpha] = new Color(value).getSource();
    return `rgba(${255 - red},${255 - green},${255 - blue},${alpha})`;
  };
  const prepare = (object: FabricObject): void => {
    object.set('objectCaching', false);
    if (object instanceof Group) object.getObjects().forEach(prepare);
    if (!invert) return;
    for (const key of ['fill', 'stroke'] as const) {
      const paint = object[key];
      if (typeof paint === 'string' && paint && !['none', 'transparent'].includes(paint)) object.set(key, invertColor(paint));
      else if (paint instanceof Gradient) paint.colorStops.forEach((stop) => { stop.color = invertColor(stop.color); });
    }
  };
  prepare(group);
  // Cache the complete artwork once; its paths remain vectors for editing and export.
  group.set('objectCaching', true);
  return group;
}
