import { CvExperience } from '../cv/interfaces/experience';

export const EXPERIENCE_COLUMNS = [
  { key: 'company', label: 'Project Name' },
  { key: 'alternativeNames', label: 'Alternative names' },
  { key: 'webLink', label: 'Web link' },
  { key: 'photos', label: 'Photos' },
  { key: 'description', label: 'Description' },
  { key: 'responsibilities', label: 'Responsibilities' },
  { key: 'technologies', label: 'Technologies' },
  { key: 'teamlead', label: 'Teamlead' },
  { key: 'developer', label: 'Developer' },
  { key: 'isUpdated', label: 'Is Updated' }
] as const satisfies readonly { key: keyof CvExperience; label: string }[];

export const EXPERIENCE_TABLE_COLUMNS = [
  EXPERIENCE_COLUMNS[0],
  EXPERIENCE_COLUMNS[1],
  { key: 'position', label: 'Position' },
  ...EXPERIENCE_COLUMNS.slice(2, 4),
  { key: 'startDate', label: 'Start date' },
  { key: 'endDate', label: 'End date' },
  ...EXPERIENCE_COLUMNS.slice(4)
] as const satisfies readonly { key: keyof CvExperience; label: string }[];

export function experienceCell(experience: CvExperience, key: (typeof EXPERIENCE_TABLE_COLUMNS)[number]['key']): string {
  const value = experience[key];
  if (Array.isArray(value)) return value.join(', ');
  return value == null ? '' : String(value);
}

export function experienceLink(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
}
