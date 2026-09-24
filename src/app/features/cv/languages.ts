export const LANGUAGES = ['Ukrainian', 'Russian', 'English'] as const;

export const LANGUAGE_LEVELS = [
  'A1 — Beginner',
  'A2 — Elementary',
  'B1 — Intermediate',
  'B2 — Upper-Intermediate',
  'C1 — Advanced',
  'C2 — Proficient',
  'Native'
] as const;

export interface CvLanguage {
  readonly language: string;
  readonly level: string;
}
