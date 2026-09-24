export interface CvExperience {
  readonly company: string;
  readonly position: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly isCurrent: boolean;
  readonly technologies: readonly string[];
  readonly description: string;
}
