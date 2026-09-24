import { Injectable, signal } from '@angular/core';
import { CvLanguage } from './languages';
import { CvExperience } from './experience';

export interface CvInfo {
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
  readonly current = this.info.asReadonly();

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
