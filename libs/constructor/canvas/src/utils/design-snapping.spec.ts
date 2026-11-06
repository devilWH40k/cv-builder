import { boundsGuides, PAGE_PADDING, snapAxis, snappingGuides } from './design-snapping';

describe('Constructor snapping', () => {
  it('retains page guides, object edges, centers and dimensions in gesture guides', () => {
    const bounds = [{ left: 200, top: 300, width: 80, height: 40 }];
    const guides = snappingGuides(bounds, 800, 1100);
    expect(guides.x).toEqual([0, PAGE_PADDING, 400, 800 - PAGE_PADDING, 800, 200, 240, 280]);
    expect(guides.y).toEqual([0, PAGE_PADDING, 550, 1100 - PAGE_PADDING, 1100, 300, 320, 340]);
    expect(guides.widths).toEqual([800 - 2 * PAGE_PADDING, 80]);
    expect(guides.heights).toEqual([1100 - 2 * PAGE_PADDING, 40]);
    bounds[0].left = 500;
    expect(snapAxis([203], guides.x, 6)).toEqual({ delta: -3, guide: 200 });
  });
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
