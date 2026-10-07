import { cvPhotoSizeMm } from './cv-photo-size';

describe('CV photo sizing', () => {
  it('defaults older CVs and invalid sizes to 40mm', () => {
    expect(cvPhotoSizeMm(undefined)).toBe(40);
    expect(cvPhotoSizeMm(NaN)).toBe(40);
    expect(cvPhotoSizeMm(Infinity)).toBe(40);
  });

  it('limits restored sizes while retaining valid sizes', () => {
    expect(cvPhotoSizeMm(-10)).toBe(24);
    expect(cvPhotoSizeMm(100)).toBe(60);
    expect(cvPhotoSizeMm(32.5)).toBe(32.5);
  });
});
