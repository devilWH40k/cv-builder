import { CustomEntryIcons } from "../../core/dialogs/custom-entry-dialog/custom-entry-icon";

export interface CvExperience {
  readonly customTechnologyIcons?: CustomEntryIcons;
  readonly savedExperienceId?: string | null;
  readonly company: string;
  readonly position: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly isCurrent: boolean;
  readonly technologies: readonly string[];
  readonly description: string;
}

export interface SavedExperience {
  readonly id: string;
  readonly experience: CvExperience;
  readonly updatedAt: number;
}
