import { Canvas, FabricObject, util } from 'fabric';

interface Scene {
  objects: Record<string, unknown>[];
  background?: unknown;
  backgroundImage?: unknown;
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function scene(source: string): Scene {
  const value: unknown = JSON.parse(source);
  if (!object(value) || !Array.isArray(value['objects']) || !value['objects'].every(object))
    throw new Error('The design history could not be restored.');
  return { objects: value['objects'], background: value['background'], backgroundImage: value['backgroundImage'] };
}

/** Keep unchanged objects and image caches; prepare replacements before touching the canvas. */
export async function restoreDesignScene(canvas: Canvas, before: string, after: string): Promise<void> {
  const current = scene(before);
  const next = scene(after);
  const identified = [...current.objects, ...next.objects].every((item) => typeof item['designId'] === 'string');
  if (!identified) { await canvas.loadFromJSON(after); return; }
  const previous = new Map(current.objects.map((item) => [item['designId'], JSON.stringify(item)]));
  const existing = new Map(canvas.getObjects().map((item) => [item.designId, item]));
  const changed = next.objects.filter((item) => !existing.has(String(item['designId'])) || previous.get(item['designId']) !== JSON.stringify(item));
  const replacements = await util.enlivenObjects<FabricObject>(changed);
  const replacementById = new Map(replacements.map((item) => [item.designId, item]));
  const backgroundChanged = JSON.stringify(current.background) !== JSON.stringify(next.background);
  const imageChanged = JSON.stringify(current.backgroundImage) !== JSON.stringify(next.backgroundImage);
  const backgrounds = await util.enlivenObjectEnlivables<{
    backgroundColor?: Canvas['backgroundColor']; backgroundImage?: FabricObject;
  }>({
    ...(backgroundChanged ? { backgroundColor: next.background ?? '' } : {}),
    ...(imageChanged ? { backgroundImage: next.backgroundImage } : {}),
  });
  const ordered = next.objects.map((item) => replacementById.get(String(item['designId'])) ?? existing.get(String(item['designId'])));
  if (ordered.some((item) => !item)) throw new Error('The design history could not be restored.');
  const renderOnAddRemove = canvas.renderOnAddRemove;
  canvas.renderOnAddRemove = false;
  try {
    canvas.discardActiveObject();
    const wanted = new Set(ordered);
    canvas.remove(...canvas.getObjects().filter((item) => !wanted.has(item)));
    ordered.forEach((item, index) => {
      if (!item) return;
      if (!canvas.getObjects().includes(item)) canvas.add(item);
      canvas.moveObjectTo(item, index);
    });
    if (backgroundChanged) canvas.backgroundColor = backgrounds.backgroundColor ?? '';
    if (imageChanged) canvas.backgroundImage = backgrounds.backgroundImage;
  } finally { canvas.renderOnAddRemove = renderOnAddRemove; }
}
