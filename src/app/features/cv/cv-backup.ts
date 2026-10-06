import { inject, Injectable } from '@angular/core';
import { SavedCvs } from './saved-cvs';

export interface ImportCounts {
  readonly cvs: number;
  readonly experiences: number;
  readonly technologies: number;
}

export function defaultBackupName(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `cv-builder-${day}.${month}.${date.getFullYear()}`;
}

@Injectable({ providedIn: 'root' })
export class CvBackup {
  private readonly saved = inject(SavedCvs);

  async export(fileName: string): Promise<void> {
    const { createArchive } = await import('./cv-archive');
    const records = await this.saved.backupSnapshot().catch(() => {
      throw new Error('Saved CVs, experiences and technologies could not be read. Please try again.');
    });
    const archive = await createArchive(records.cvs, records.experiences, records.technologies);
    const url = URL.createObjectURL(archive);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.trim().replace(/\.zip$/i, '') + '.zip';
    document.body.append(link);
    try { link.click(); } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  async import(file: File, wipePreviousData = false): Promise<ImportCounts> {
    const { readArchive } = await import('./cv-archive');
    const records = await readArchive(file);
    await this.saved.importRecords(records.cvs, records.experiences, wipePreviousData, records.technologies).catch(() => {
      throw new Error('CVs, experiences and technologies could not be imported. Browser storage may be full or unavailable. Existing saves were kept.');
    });
    return { cvs: records.cvs.length, experiences: records.experiences.length, technologies: records.technologies?.length ?? 0 };
  }
}
