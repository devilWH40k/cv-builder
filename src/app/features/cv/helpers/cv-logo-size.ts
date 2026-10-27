export function cvLogoSizeMm(size: number | undefined): number {
  return Math.min(40, Math.max(10, size !== undefined && Number.isFinite(size) ? size : 18));
}
