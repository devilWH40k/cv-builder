export interface SnapBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SnapMatch {
  delta: number;
  guide: number;
}

export const PAGE_PADDING = (16 * 96) / 25.4;

/** Find the nearest visual edge/center within a screen-derived tolerance. */
export function snapAxis(points: readonly number[], guides: readonly number[], tolerance: number): SnapMatch | null {
  let match: SnapMatch | null = null;
  for (const point of points) {
    for (const guide of guides) {
      const delta = guide - point;
      if (Math.abs(delta) <= tolerance && (!match || Math.abs(delta) < Math.abs(match.delta)))
        match = { delta, guide };
    }
  }
  return match;
}

export function boundsGuides(bounds: SnapBounds, axis: 'x' | 'y'): number[] {
  const start = axis === 'x' ? bounds.left : bounds.top;
  const size = axis === 'x' ? bounds.width : bounds.height;
  return [start, start + size / 2, start + size];
}
