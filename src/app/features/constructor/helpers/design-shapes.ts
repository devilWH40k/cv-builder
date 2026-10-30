import { Ellipse, Polygon, Triangle } from 'fabric';
import { EffectCircle, EffectRect } from './effect-shapes';

export const DESIGN_SHAPES = [
  'rectangle', 'circle', 'line', 'triangle', 'ellipse', 'diamond', 'pentagon', 'hexagon', 'star',
] as const;
export type DesignShape = (typeof DESIGN_SHAPES)[number];

export function createDesignShape(shape: DesignShape) {
  const options = { left: 80, top: 100, fill: '#36d4f7', originX: 'left', originY: 'top' } as const;
  switch (shape) {
    case 'rectangle': return new EffectRect({ ...options, width: 180, height: 100 });
    case 'line': return new EffectRect({ ...options, width: 180, height: 3 });
    case 'circle': return new EffectCircle({ ...options, radius: 50 });
    case 'ellipse': return new Ellipse({ ...options, rx: 80, ry: 50 });
    case 'triangle': return new Triangle({ ...options, width: 120, height: 110 });
    default: {
      const sides = shape === 'diamond' ? 4 : shape === 'pentagon' ? 5 : shape === 'hexagon' ? 6 : 10;
      const points = Array.from({ length: sides }, (_, index) => {
        const angle = index * Math.PI * 2 / sides - Math.PI / 2;
        const radius = shape === 'star' && index % 2 ? 27 : 60;
        return { x: 60 + Math.cos(angle) * radius, y: 60 + Math.sin(angle) * radius };
      });
      return new Polygon(points, options);
    }
  }
}
