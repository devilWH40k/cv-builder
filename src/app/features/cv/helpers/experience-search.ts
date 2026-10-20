import type { SavedExperience } from '../interfaces/experience';

export const EXPERIENCE_SEARCH_KEYS = [
  'company', 'alternativeNames', 'position', 'webLink', 'photos', 'startDate', 'endDate',
  'description', 'responsibilities', 'technologies', 'teamlead', 'developer', 'isUpdated'
] as const;

export interface ExperienceSearchEntry {
  readonly id: string;
  readonly sortTime: number;
  readonly fields: Readonly<Record<string, string>>;
}

export function experienceSearchEntry(record: SavedExperience): ExperienceSearchEntry {
  return { id: record.id, sortTime: -record.updatedAt,
    fields: Object.fromEntries(EXPERIENCE_SEARCH_KEYS.map((key) => {
      const value = record.experience[key];
      return [key, (Array.isArray(value) ? value.join(', ') : String(value ?? '')).toLocaleLowerCase()];
    })) };
}

export function putExperience(transaction: IDBTransaction, record: SavedExperience, add = false): void {
  const store = transaction.objectStore('experiences');
  if (add) store.add(record);
  else store.put(record);
  transaction.objectStore('experience-search').put(experienceSearchEntry(record));
}
