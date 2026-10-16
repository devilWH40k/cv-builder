import { Injectable, signal } from '@angular/core';
import { CvContactInfo } from '../helpers/cv-contact';
import { CvLanguage } from '../constants/languages';
import { CvExperience } from '../interfaces/experience';
import { CvEducation } from '../interfaces/education';
import { CvTheme } from '../constants/cv-themes';
import { CustomEntryIcons } from '../../../core/dialogs/custom-entry-dialog/custom-entry-icon';

export interface CvStructure {
  readonly theme?: CvTheme;
  readonly showPhoto?: boolean;
  readonly photoSizeMm?: number;
  readonly sidebarPosition: 'left' | 'right';
  readonly technologiesView: 'blocks' | 'comma-separated';
  readonly technologiesPosition?: 'top' | 'bottom';
  readonly sidebarTechnologiesView?: 'blocks' | 'list';
}

export const DEFAULT_CV_STRUCTURE: CvStructure = {
  showPhoto: true, theme: 'basic', sidebarPosition: 'right', technologiesView: 'blocks', technologiesPosition: 'bottom', sidebarTechnologiesView: 'list'
};

export interface CvInfo {
  readonly contact?: CvContactInfo;
  readonly customTechnologyIcons?: CustomEntryIcons;
  readonly structure?: CvStructure;
  readonly name: string;
  readonly positionTitle: string;
  readonly description: string;
  readonly photo: File | null;
  readonly languages: readonly CvLanguage[];
  readonly technologies: readonly string[];
  readonly experiences: readonly CvExperience[];
  readonly education?: readonly CvEducation[];
}

@Injectable({ providedIn: 'root' })
export class CvDraft {
  private readonly info = signal<CvInfo | null>(null);
  private readonly sessionId = signal(0);
  readonly session = this.sessionId.asReadonly();
  readonly current = this.info.asReadonly();
  readonly savedId = signal<string | null>(null);

  updateStructure(structure: CvStructure): void {
    this.info.update((info) => info ? { ...info, structure: { ...structure } } : null);
  }

  reset(): void {
    this.sessionId.update((id) => id + 1);
    this.info.set(null);
    this.savedId.set(null);
  }

  save(info: CvInfo): void {
    this.info.set({
      ...info,
      ...(info.contact ? { contact: { ...info.contact, socials: info.contact.socials.map((entry) => ({ ...entry })) } } : {}),
      ...(info.customTechnologyIcons ? { customTechnologyIcons: { ...info.customTechnologyIcons } } : {}),
      languages: info.languages.map((language) => ({ ...language })),
      ...(info.education ? { education: info.education.map((entry) => ({ ...entry })) } : {}),
      technologies: [...info.technologies],
      experiences: info.experiences.map((experience) => ({
        ...experience, technologies: [...experience.technologies],
        ...(experience.customTechnologyIcons ? { customTechnologyIcons: { ...experience.customTechnologyIcons } } : {})
      }))
    });
  }
}
