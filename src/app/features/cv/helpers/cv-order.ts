import type { SavedCv } from '../services/saved-cvs';

export function orderSavedCvs(cvs: readonly SavedCv[], savedOrder: unknown): SavedCv[] {
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
