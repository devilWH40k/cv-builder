import { TableColumn } from '../../shared/ui/table/models/table-column';
import { CvExperience, SavedExperience } from '../cv/interfaces/experience';

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

const EXPERIENCE_DISPLAY_COLUMNS = [
  { ...EXPERIENCE_COLUMNS[0], minWidth: 10 },
  { ...EXPERIENCE_COLUMNS[1], minWidth: 10 },
  { key: 'position', label: 'Position', minWidth: 12 },
  { ...EXPERIENCE_COLUMNS[2], minWidth: 14 },
  { ...EXPERIENCE_COLUMNS[3], minWidth: 14 },
  { key: 'startDate', label: 'Start date', minWidth: 8, grow: 0 },
  { key: 'endDate', label: 'End date', minWidth: 8, grow: 0 },
  { ...EXPERIENCE_COLUMNS[4], minWidth: 20, grow: 2 },
  { ...EXPERIENCE_COLUMNS[5], minWidth: 20, grow: 2 },
  { ...EXPERIENCE_COLUMNS[6], minWidth: 14 },
  { ...EXPERIENCE_COLUMNS[7], minWidth: 10 },
  { ...EXPERIENCE_COLUMNS[8], minWidth: 10 },
  { ...EXPERIENCE_COLUMNS[9], minWidth: 6, grow: 0 }
] as const;

export const EXPERIENCE_TABLE_COLUMNS: readonly TableColumn<SavedExperience>[] = [
  ...EXPERIENCE_DISPLAY_COLUMNS.map((column) => ({
    ...column, value: (record: SavedExperience) => experienceCell(record.experience, column.key)
  })),
  { key: 'actions', label: 'Actions', minWidth: 8, grow: 0, hideable: false, searchable: false, stickyRight: true }
];

export function experienceCell(experience: CvExperience, key: (typeof EXPERIENCE_DISPLAY_COLUMNS)[number]['key']): string {
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
