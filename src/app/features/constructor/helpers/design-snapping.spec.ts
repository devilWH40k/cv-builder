import { boundsGuides, PAGE_PADDING, snapAxis } from './design-snapping';

describe('Constructor snapping', () => {
  it('chooses the closest edge or center and ignores distant guides', () => {
    const points = boundsGuides({ left: 58, top: 80, width: 100, height: 60 }, 'x');
    expect(snapAxis(points, [PAGE_PADDING, 110, 160], 6)).toEqual({ delta: 2, guide: 110 });
    expect(snapAxis(points, [200], 6)).toBeNull();
    expect(boundsGuides({ left: 58, top: 80, width: 100, height: 60 }, 'y')).toEqual([80, 110, 140]);
  });
  it('matches dimensions within the same screen tolerance at different zoom levels', () => {
    expect(snapAxis([194], [200], 6)).toEqual({ delta: 6, guide: 200 });
    expect(snapAxis([194], [200], 6 / 2)).toBeNull();
    expect(snapAxis([190], [200], 6 / 0.5)).toEqual({ delta: 10, guide: 200 });
  });
});
