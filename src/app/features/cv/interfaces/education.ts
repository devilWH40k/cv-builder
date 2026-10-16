export interface CvEducation {
  readonly university: string;
  readonly degree: string;
  readonly field: string;
  readonly startDate: string;
  readonly endDate: string;
}

export const EDUCATION_DEGREES = [
  'Associate', 'Bachelor', 'Master', 'Doctorate (PhD)', 'Diploma', 'Certificate', 'Other'
] as const;
