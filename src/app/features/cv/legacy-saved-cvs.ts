import type { SavedCv } from './saved-cvs';
import { CvInfo } from './cv-draft';

interface StoredPhoto {
  readonly name: string;
  readonly type: string;
  readonly base64: string;
}

interface LegacyCv {
  readonly id: string;
  readonly info: Omit<CvInfo, 'photo'> & { readonly photo: StoredPhoto | null };
}

export const LEGACY_STORAGE_KEY = 'cv-builder.saved-cvs.v1';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');

function isLegacyCv(value: unknown): value is LegacyCv {
  if (!isObject(value) || typeof value['id'] !== 'string' || !isObject(value['info'])) return false;
  const info = value['info'];
  const photo = info['photo'];
  return ['name', 'positionTitle', 'description'].every((key) => typeof info[key] === 'string') &&
    isStrings(info['technologies']) && Array.isArray(info['languages']) &&
    info['languages'].every((item: unknown) => isObject(item) &&
      typeof item['language'] === 'string' && typeof item['level'] === 'string') &&
    Array.isArray(info['experiences']) && info['experiences'].every((item: unknown) =>
      isObject(item) && ['company', 'position', 'startDate', 'endDate', 'description']
        .every((key) => typeof item[key] === 'string') && typeof item['isCurrent'] === 'boolean' &&
      isStrings(item['technologies'])) &&
    (photo === null || (isObject(photo) && typeof photo['name'] === 'string' &&
      typeof photo['type'] === 'string' && typeof photo['base64'] === 'string'));
}

export function parseLegacyCvs(json: string): SavedCv[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed) || !parsed.every(isLegacyCv)) {
    throw new Error('Invalid legacy CV data.');
  }
  return parsed.map((record, index) => {
    const photo = record.info.photo;
    return {
      id: record.id,
      updatedAt: parsed.length - index,
      info: {
        ...record.info,
        photo: photo ? new File([
          Uint8Array.from(atob(photo.base64), (character) => character.charCodeAt(0))
        ], photo.name, { type: photo.type }) : null
      }
    };
  });
}
