import { Circle, FabricImage, FabricObject, Gradient, IText, Rect, Shadow } from 'fabric';
import { applyImageEffects, imageEffects } from './image-effects';

function copyPaint(paint: FabricObject['fill']): FabricObject['fill'] {
  if (!(paint instanceof Gradient)) return paint;
  return paint.type === 'linear'
    ? new Gradient<'linear'>({ ...paint.toObject(), type: 'linear' })
    : new Gradient<'radial'>({ ...paint.toObject(), type: 'radial' });
}

export function captureVisualStyle(source: FabricObject) {
  return {
    opacity: source.opacity,
    paint: source instanceof FabricImage ? null : {
      fill: copyPaint(source.fill), stroke: copyPaint(source.stroke),
      strokeWidth: source.strokeWidth, strokeDashArray: source.strokeDashArray ? [...source.strokeDashArray] : null,
      strokeLineCap: source.strokeLineCap, strokeLineJoin: source.strokeLineJoin,
    },
    shadow: source.shadow ? new Shadow(source.shadow.toObject()) : null,
    blur: source instanceof Rect || source instanceof Circle ? source.designBlur ?? 0 : null,
    radius: source instanceof Rect ? { rx: source.rx, ry: source.ry } : null,
    text: source instanceof IText ? {
      fontFamily: source.fontFamily, fontSize: source.fontSize, fontWeight: source.fontWeight,
      fontStyle: source.fontStyle, underline: source.underline, linethrough: source.linethrough,
      overline: source.overline, textAlign: source.textAlign, lineHeight: source.lineHeight,
      charSpacing: source.charSpacing,
    } : null,
    image: source instanceof FabricImage ? imageEffects(source) : null,
  };
}

export type VisualStyle = ReturnType<typeof captureVisualStyle>;

export function applyVisualStyle(style: VisualStyle, target: FabricObject): void {
  if (target.lockMovementX) return;
  target.set({ opacity: style.opacity, shadow: style.shadow ? new Shadow(style.shadow.toObject()) : null });
  if (style.paint && !(target instanceof FabricImage)) {
    target.set({ ...style.paint, fill: copyPaint(style.paint.fill), stroke: copyPaint(style.paint.stroke),
      strokeDashArray: style.paint.strokeDashArray ? [...style.paint.strokeDashArray] : null });
    if (target instanceof IText) target.removeStyle('fill');
  }
  if (style.blur !== null && (target instanceof Rect || target instanceof Circle)) target.designBlur = style.blur;
  if (style.radius && target instanceof Rect) target.set({
    rx: Math.min(style.radius.rx, target.width / 2), ry: Math.min(style.radius.ry, target.height / 2),
  });
  if (style.text && target instanceof IText) {
    target.set('styles', {});
    target.set(style.text);
    target.initDimensions();
  }
  if (style.image && target instanceof FabricImage) applyImageEffects(target, style.image);
  target.set('dirty', true);
  target.setCoords();
}
