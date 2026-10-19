import type { CvInfo } from '../services/cv-draft';

export function cvInfoEqual(previous: CvInfo | null, current: CvInfo | null): boolean {
  return sameValue(previous, current);
}

function sameValue(previous: unknown, current: unknown): boolean {
  if (Object.is(previous, current)) return true;
  if (typeof previous !== 'object' || previous === null ||
      typeof current !== 'object' || current === null) return false;
  // Files are immutable; a different photo must count as an edit even with matching metadata.
  if (previous instanceof Blob || current instanceof Blob) return false;
  if (Array.isArray(previous) !== Array.isArray(current)) return false;
  const entries = Object.entries(previous);
  return entries.length === Object.keys(current).length && entries.every(([key, value]) =>
    Object.hasOwn(current, key) && sameValue(value, Reflect.get(current, key)));
}
