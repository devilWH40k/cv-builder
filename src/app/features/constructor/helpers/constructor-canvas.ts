import { Canvas, FabricObject, Group } from 'fabric';

interface GestureLayers {
  readonly objects: FabricObject[];
  readonly count: number;
  readonly moving: FabricObject;
  readonly before: HTMLCanvasElement | null;
  readonly after: HTMLCanvasElement | null;
  readonly transform: DOMMatrix;
  readonly width: number;
  readonly height: number;
}

function sameTransform(first: DOMMatrix, second: DOMMatrix): boolean {
  return first.a === second.a && first.b === second.b && first.c === second.c &&
    first.d === second.d && first.e === second.e && first.f === second.f;
}

/** Reuse stationary artwork during a gesture, preserving layers above the moving object. */
export class ConstructorCanvas extends Canvas {
  private gestureTarget: FabricObject | null = null;
  private gestureLayers: GestureLayers | null = null;

  beginGesture(target: FabricObject): void {
    this.endGesture();
    this.gestureTarget = target;
  }

  endGesture(): void {
    for (const layer of [this.gestureLayers?.before, this.gestureLayers?.after]) {
      if (layer) { layer.width = 0; layer.height = 0; }
    }
    this.gestureLayers = null;
    this.gestureTarget = null;
  }

  override destroy(): void {
    this.endGesture();
    super.destroy();
  }

  override _renderObjects(context: CanvasRenderingContext2D, objects: FabricObject[]): void {
    const target = this.gestureTarget;
    if (!target || objects.length < 2) { super._renderObjects(context, objects); return; }
    const transform = context.getTransform();
    const width = context.canvas.width;
    const height = context.canvas.height;
    // Limit the two temporary layers to 32 MiB of pixel data in total.
    if (width * height > 4 * 1024 ** 2) {
      this.endGesture();
      super._renderObjects(context, objects);
      return;
    }
    let layers = this.gestureLayers;
    if (layers && (layers.objects !== objects || layers.count !== objects.length ||
      layers.width !== width || layers.height !== height ||
      !sameTransform(layers.transform, transform))) {
      this.beginGesture(target);
      layers = null;
    }
    if (!layers) {
      const moving = objects.filter(object => object === target || target.isDescendantOf(object));
      // Multi-selections can span the stack; nonstandard blend modes depend on lower layers.
      const usesBlending = (object: FabricObject): boolean => object.globalCompositeOperation !== 'source-over' ||
        (object instanceof Group && object.getObjects().some(usesBlending));
      if (moving.length !== 1 || objects.some(usesBlending)) {
        this.endGesture();
        super._renderObjects(context, objects);
        return;
      }
      const index = objects.indexOf(moving[0]);
      const renderLayer = (items: FabricObject[]): HTMLCanvasElement | null => {
        if (!items.length) return null;
        const layer = document.createElement('canvas');
        layer.width = width;
        layer.height = height;
        const layerContext = layer.getContext('2d');
        if (!layerContext) return null;
        layerContext.imageSmoothingEnabled = context.imageSmoothingEnabled;
        layerContext.setTransform(transform);
        super._renderObjects(layerContext, items);
        return layer;
      };
      const before = renderLayer(objects.slice(0, index));
      const after = renderLayer(objects.slice(index + 1));
      if ((index > 0 && !before) || (index < objects.length - 1 && !after)) {
        for (const layer of [before, after]) {
          if (layer) { layer.width = 0; layer.height = 0; }
        }
        this.endGesture();
        super._renderObjects(context, objects);
        return;
      }
      layers = { objects, count: objects.length, moving: moving[0], before, after, transform, width, height };
      this.gestureLayers = layers;
    }
    const drawLayer = (layer: HTMLCanvasElement | null): void => {
      if (!layer) return;
      context.save();
      context.resetTransform();
      context.drawImage(layer, 0, 0);
      context.restore();
    };
    drawLayer(layers.before);
    layers.moving.render(context);
    drawLayer(layers.after);
  }
}
