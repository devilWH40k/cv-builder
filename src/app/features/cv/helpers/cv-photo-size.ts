export const CV_PHOTO_MIN_MM = 24;
export const CV_PHOTO_MAX_MM = 60;
export const CV_PHOTO_DEFAULT_MM = 40;
export const CSS_PIXELS_PER_MM = 96 / 25.4;

export function cvPhotoSizeMm(size: number | undefined): number {
  return Math.min(CV_PHOTO_MAX_MM, Math.max(CV_PHOTO_MIN_MM,
    size !== undefined && Number.isFinite(size) ? size : CV_PHOTO_DEFAULT_MM));
}
