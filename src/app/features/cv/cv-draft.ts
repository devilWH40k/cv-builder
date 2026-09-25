import { Injectable, signal } from '@angular/core';
import { CvLanguage } from './languages';
import { CvExperience } from './experience';

export interface CvStructure {
  readonly sidebarPosition: 'left' | 'right';
  readonly technologiesView: 'blocks' | 'comma-separated';
  readonly sidebarTechnologiesView?: 'blocks' | 'list';
}

export const DEFAULT_CV_STRUCTURE: CvStructure = {
  sidebarPosition: 'right', technologiesView: 'blocks', sidebarTechnologiesView: 'list'
};

export interface CvInfo {
  readonly structure?: CvStructure;
  readonly name: string;
  readonly positionTitle: string;
  readonly description: string;
  readonly photo: File | null;
  readonly languages: readonly CvLanguage[];
  readonly technologies: readonly string[];
  readonly experiences: readonly CvExperience[];
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
      languages: info.languages.map((language) => ({ ...language })),
      technologies: [...info.technologies],
      experiences: info.experiences.map((experience) => ({
        ...experience, technologies: [...experience.technologies]
      }))
    });
  }
}
