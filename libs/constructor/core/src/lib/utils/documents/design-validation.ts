import { A4_WIDTH, A4_HEIGHT, PageGuide } from '../../interfaces/constructor-document';
import { DESIGN_FONTS } from '../design-font-catalog';
import { ConstructorDocument } from '../../interfaces/constructor-document';
import { safeDesignLink } from './design-link';

const INVALID = 'This is not a supported constructor design.';
const OBJECT_TYPES = new Set([
  'Textbox',
  'IText',
  'Text',
  'Rect',
  'Circle',
  'Ellipse',
  'Line',
  'Triangle',
  'Path',
  'Polygon',
  'Polyline',
  'Image',
  'Group',
  'Blur', 'Brightness', 'Contrast', 'Saturation', 'Grayscale', 'Sepia', 'Invert',
]);

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(INVALID);
  return value as Record<string, unknown>;
}

/** Validate the engine payload before enlivening objects; imported designs never fetch URLs. */
export function validateDesignScene(scene: string): void {
  if (scene.length > 40 * 1024 ** 2) throw new Error('The design page is too large.');
  const root = record(JSON.parse(scene));
  if (!Array.isArray(root['objects']) || root['objects'].length > 5000) throw new Error(INVALID);
  let count = 0;
  const visit = (value: unknown, depth: number): void => {
    if (depth > 30 || ++count > 200000) throw new Error(INVALID);
    if (Array.isArray(value)) {
      value.forEach((child) => visit(child, depth + 1));
      return;
    }
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(INVALID);
    if (!value || typeof value !== 'object') return;
    const properties = record(value);
    for (const [key, child] of Object.entries(properties)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error(INVALID);
      if (
        key === 'type' &&
        typeof child === 'string' &&
        !OBJECT_TYPES.has(child) &&
        !['linear', 'radial', 'layoutManager'].includes(child)
      )
        throw new Error(INVALID);
      if (
        key === 'src' &&
        (typeof child !== 'string' ||
          !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(child))
      )
        throw new Error(INVALID);
      if (key === 'linkUrl' && child && (typeof child !== 'string' || !safeDesignLink(child)))
        throw new Error(INVALID);
      if (key === 'fontFamily' && !DESIGN_FONTS.some((font) => font === child) && !['sans-serif', 'serif', 'monospace'].includes(String(child))) throw new Error(INVALID);
      if (key === 'strategy' && !['fit-content', 'fixed'].includes(String(child))) throw new Error(INVALID);
      if (key === 'designBlur' && (typeof child !== 'number' || child < 0 || child > 40)) throw new Error(INVALID);
      if ((key === 'designPartialLock' || key === 'designFullLock') && typeof child !== 'boolean') throw new Error(INVALID);
      if ((key === 'designLayerName' || key === 'designIconName') && (typeof child !== 'string' || !child.trim() || child.length > 100)) throw new Error(INVALID);
      if (typeof properties['type'] === 'string' &&
          ['Brightness', 'Contrast', 'Saturation', 'Blur'].includes(properties['type']) &&
          ['brightness', 'contrast', 'saturation', 'blur'].includes(key) &&
          (typeof child !== 'number' || child < (key === 'blur' ? 0 : -1) || child > 1))
        throw new Error(INVALID);
      visit(child, depth + 1);
    }
  };
  visit(root, 0);
}

export function parseDesign(value: unknown): ConstructorDocument {
  const source = record(value);
  if (
    source['schemaVersion'] !== 1 ||
    typeof source['id'] !== 'string' ||
    !source['id'] ||
    typeof source['title'] !== 'string' ||
    source['title'].length > 200 ||
    !(source['sourceCvId'] === null || typeof source['sourceCvId'] === 'string') ||
    typeof source['updatedAt'] !== 'number' ||
    !Number.isFinite(source['updatedAt']) ||
    !Array.isArray(source['pages']) ||
    !source['pages'].length ||
    source['pages'].length > 50
  )
    throw new Error(INVALID);
  const ids = new Set<string>();
  const pages = source['pages'].map((value) => {
    const page = record(value);
    if (
      typeof page['id'] !== 'string' ||
      !page['id'] ||
      ids.has(page['id']) ||
      typeof page['scene'] !== 'string'
    )
      throw new Error(INVALID);
    ids.add(page['id']);
    validateDesignScene(page['scene']);
    const guides: PageGuide[] = [];
    if (page['guides'] !== undefined) {
      if (!Array.isArray(page['guides']) || page['guides'].length > 200) throw new Error(INVALID);
      const guideIds = new Set<string>();
      for (const entry of page['guides']) {
        const guide = record(entry);
        const axis = guide['axis'];
        const position = guide['position'];
        const id = guide['id'];
        if (typeof id !== 'string' || !id || guideIds.has(id) ||
            (axis !== 'x' && axis !== 'y') || typeof position !== 'number' ||
            !Number.isFinite(position) || position < 0 || position > (axis === 'x' ? A4_WIDTH : A4_HEIGHT))
          throw new Error(INVALID);
        guideIds.add(id);
        guides.push({ id, axis, position });
      }
    }
    return { id: page['id'], scene: page['scene'], ...(guides.length ? { guides } : {}) };
  });
  return {
    schemaVersion: 1,
    id: source['id'],
    title: source['title'],
    sourceCvId: source['sourceCvId'],
    updatedAt: source['updatedAt'],
    pages,
  };
}
