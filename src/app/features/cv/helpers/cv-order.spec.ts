import { SavedCv } from '../services/saved-cvs';
import { orderSavedCvs } from './cv-order';

describe('Saved CV ordering', () => {
  const cvs: readonly SavedCv[] = ['a', 'b', 'c'].map((id, index) => ({
    id, updatedAt: index, info: { name: id, positionTitle: '', description: '', photo: null,
      technologies: [], languages: [], experiences: [] }
  }));

  it('falls back to last updated for older saves and invalid order metadata', () => {
    for (const order of [undefined, null, {}, 'invalid', [42, null]]) {
      expect(orderSavedCvs(cvs, order).map((cv) => cv.id)).toEqual(['c', 'b', 'a']);
    }
  });

  it('ignores removed IDs and places new CVs before the existing manual order without mutating data', () => {
    expect(orderSavedCvs(cvs, ['removed', 'a', 'c']).map((cv) => cv.id)).toEqual(['b', 'a', 'c']);
    expect(cvs.map((cv) => cv.id)).toEqual(['a', 'b', 'c']);
  });
});
