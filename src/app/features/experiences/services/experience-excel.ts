import { Injectable } from '@angular/core';
import type { ExperienceImportResult } from '../helpers/experience-excel';

@Injectable({ providedIn: 'root' })
export class ExperienceExcel {
  async parse(file: File): Promise<ExperienceImportResult> {
    const { readExperienceExcel } = await import('../helpers/experience-excel');
    return readExperienceExcel(file);
  }

  async downloadTemplate(): Promise<void> {
    const { createExperienceTemplate } = await import('../helpers/experience-excel');
    const url = URL.createObjectURL(createExperienceTemplate());
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template.xlsx';
    document.body.append(link);
    try { link.click(); } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}
