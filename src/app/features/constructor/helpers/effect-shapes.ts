import { Circle, Group, Rect, classRegistry, FabricObject } from 'fabric';
import './fabric-metadata';

function renderBlur(object: FabricObject, context: CanvasRenderingContext2D, render: () => void): void {
  const blur = object.designBlur ?? 0;
  context.save();
  if (blur > 0) {
    const matrix = context.getTransform();
    const scale = object.getObjectScaling();
    context.filter = `blur(${blur * Math.max(scale.x, scale.y) * Math.hypot(matrix.a, matrix.b)}px)`;
  }
  render();
  context.restore();
}

export class EffectRect extends Rect {
  override render(context: CanvasRenderingContext2D): void {
    renderBlur(this, context, () => super.render(context));
  }
}

export class EffectCircle extends Circle {
  override render(context: CanvasRenderingContext2D): void {
    renderBlur(this, context, () => super.render(context));
  }
}

function containsBlur(object: FabricObject): boolean {
  return (object.designBlur ?? 0) > 0 ||
    (object instanceof Group && object.getObjects().some(containsBlur));
}

export class EffectGroup extends Group {
  override shouldCache(): boolean {
    const cached = super.shouldCache();
    // Geometry-sized group caches crop the blur halo. Explicit clip paths still apply.
    if (cached && !this.clipPath && this.getObjects().some(containsBlur)) {
      this.ownCaching = false;
      return false;
    }
    return cached;
  }
}

// Keep native scene types so existing designs reopen with the same editable geometry.
classRegistry.setClass(EffectRect, 'Rect');
classRegistry.setClass(EffectCircle, 'Circle');
classRegistry.setClass(EffectGroup, 'Group');

/** Bake only an affected object for PDF engines which cannot render SVG filters. */
export function rasterEffectSvg(object: FabricObject): string {
  const group = object.group;
  const canvas = object.canvas;
  try {
    // The enclosing SVG groups supply their transforms and opacity exactly once.
    // Detach the export object so local coordinates are not culled against the page.
    object.group = undefined;
    object.canvas = undefined;
    return localRasterEffectSvg(object);
  } finally {
    object.group = group;
    object.canvas = canvas;
    object.setCoords();
  }
}

function localRasterEffectSvg(object: FabricObject): string {
  object.setCoords();
  const bounds = object.getBoundingRect();
  const scale = object.getObjectScaling();
  const padding = Math.ceil((object.designBlur ?? 0) * Math.max(scale.x, scale.y) * 3 + 2);
  const width = bounds.width + padding * 2;
  const height = bounds.height + padding * 2;
  const resolution = Math.min(2, 8192 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(width * resolution));
  canvas.height = Math.max(1, Math.ceil(height * resolution));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image effects could not be exported.');
  context.scale(resolution, resolution);
  context.translate(padding - bounds.left, padding - bounds.top);
  object.render(context);
  const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  image.setAttribute('x', String(bounds.left - padding));
  image.setAttribute('y', String(bounds.top - padding));
  image.setAttribute('width', String(width));
  image.setAttribute('height', String(height));
  image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', canvas.toDataURL('image/png'));
  return new XMLSerializer().serializeToString(image);
}
