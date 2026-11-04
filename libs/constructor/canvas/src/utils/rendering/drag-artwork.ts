import { FabricObject, Group, Point } from 'fabric';

/** A translation-only preview, including artwork initially outside the page. */
export class DragArtwork {
  private readonly layer = document.createElement('canvas');
  private matrix: number[] = [];
  private viewport: DOMMatrix | null = null;
  private left = 0;
  private top = 0;

  constructor(private readonly maxPixels = 4 * 1024 ** 2) {}

  dispose(): void {
    this.layer.width = this.layer.height = 0;
    this.viewport = null;
  }

  render(context: CanvasRenderingContext2D, object: FabricObject, artwork = [object]): void {
    if (artwork.length === 1 && artwork[0] === object && !object.group &&
      object.canvas?.skipOffscreen && !object.isOnScreen()) {
      this.dispose();
      object.render(context);
      return;
    }
    const matrix = object.calcTransformMatrix();
    const viewport = context.getTransform();
    if (!this.viewport || artwork.some(item => item.dirty) ||
      matrix.slice(0, 4).some((value, index) => value !== this.matrix[index]) ||
      (['a', 'b', 'c', 'd', 'e', 'f'] as const).some(key =>
        viewport[key] !== this.viewport![key])) {
      this.dispose();
      if (!this.capture(context, artwork)) { artwork.forEach(item => item.render(context)); return; }
      this.matrix = matrix;
      this.viewport = viewport;
    }
    const dx = matrix[4] - this.matrix[4];
    const dy = matrix[5] - this.matrix[5];
    context.save();
    context.resetTransform();
    context.drawImage(this.layer,
      this.left + viewport.a * dx + viewport.c * dy,
      this.top + viewport.b * dx + viewport.d * dy);
    context.restore();
  }

  private capture(context: CanvasRenderingContext2D, artwork: FabricObject[]): boolean {
    const viewport = context.getTransform();
    const corners = artwork.flatMap(object => {
      const bounds = object.getBoundingRect();
      return [
        new Point(bounds.left, bounds.top),
        new Point(bounds.left + bounds.width, bounds.top),
        new Point(bounds.left, bounds.top + bounds.height),
        new Point(bounds.left + bounds.width, bounds.top + bounds.height),
      ].map(point => viewport.transformPoint(point));
    });
    // Match renderBlur's device-pixel radius, including each child's parent transform.
    const halo = (child: FabricObject, parentTransform: DOMMatrix, root = true): number => {
      const scale = child.getObjectScaling();
      const padding = (child.designBlur ?? 0) * Math.max(scale.x, scale.y) *
        Math.hypot(parentTransform.a, parentTransform.b) * 3;
      const transform = parentTransform.multiply(new DOMMatrix(
        root ? child.calcTransformMatrix() : child.calcOwnMatrix()));
      return Math.max(padding, ...(child instanceof Group
        ? child.getObjects().map(item => halo(item, transform, false)) : []));
    };
    const padding = Math.ceil(Math.max(...artwork.map(object => halo(object, viewport)))) + 2;
    this.left = Math.floor(Math.min(...corners.map(point => point.x)) - padding);
    this.top = Math.floor(Math.min(...corners.map(point => point.y)) - padding);
    const width = Math.ceil(Math.max(...corners.map(point => point.x)) + padding) - this.left;
    const height = Math.ceil(Math.max(...corners.map(point => point.y)) + padding) - this.top;
    // Bound this additional preview to 16 MiB; large artwork keeps normal rendering.
    if (width * height > this.maxPixels || width > 8192 || height > 8192) return false;
    this.layer.width = width;
    this.layer.height = height;
    const layerContext = this.layer.getContext('2d');
    if (!layerContext) return false;
    layerContext.imageSmoothingEnabled = context.imageSmoothingEnabled;
    layerContext.setTransform(viewport.a, viewport.b, viewport.c, viewport.d,
      viewport.e - this.left, viewport.f - this.top);
    artwork.forEach(object => object.render(layerContext));
    return true;
  }
}

export function canPreviewDrag(object: FabricObject): boolean {
  const hasBlur = (child: FabricObject): boolean => (child.designBlur ?? 0) > 0 ||
    (child instanceof Group && child.getObjects().some(hasBlur));
  return hasBlur(object) && canCacheArtwork(object);
}

export function canCacheArtwork(object: FabricObject): boolean {
  return !object.shadow && !object.clipPath?.absolutePositioned &&
    object.globalCompositeOperation === 'source-over' &&
    (!(object instanceof Group) || object.getObjects().every(canCacheArtwork));
}
