import type { SavedCv } from '../services/saved-cvs';
import type { CvReorder } from '../interfaces/cv-reorder';

export function reorderCvs<T extends Pick<SavedCv, 'id'>>(cvs: readonly T[], reorder: CvReorder): readonly T[] {
  const source = cvs.findIndex((cv) => cv.id === reorder.cvId);
  const target = cvs.findIndex((cv) => cv.id === reorder.targetId);
  if (source < 0 || target < 0 || source === target ||
    source === target + (reorder.position === 'before' ? -1 : 1)) return cvs;
  const remaining = cvs.filter((cv) => cv.id !== reorder.cvId);
  const index = remaining.findIndex((cv) => cv.id === reorder.targetId) + (reorder.position === 'after' ? 1 : 0);
  return [...remaining.slice(0, index), cvs[source], ...remaining.slice(index)];
}

export function orderSavedCvs<T extends Pick<SavedCv, 'id' | 'updatedAt'>>(cvs: readonly T[], savedOrder: unknown): T[] {
  const ids = Array.isArray(savedOrder)
    ? savedOrder.filter((id): id is string => typeof id === 'string')
    : [];
  const positions = new Map(ids.map((id, index) => [id, index]));

  return [...cvs].sort((first, second) => {
    const firstPosition = positions.get(first.id);
    const secondPosition = positions.get(second.id);
    if (firstPosition !== undefined && secondPosition !== undefined) return firstPosition - secondPosition;
    if (firstPosition !== undefined) return 1;
    if (secondPosition !== undefined) return -1;
    return second.updatedAt - first.updatedAt;
  });
}
