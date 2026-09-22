import { Injectable, signal } from '@angular/core';

export interface CvInfo {
  readonly name: string;
  readonly positionTitle: string;
  readonly description: string;
  readonly photo: File | null;
}

@Injectable({ providedIn: 'root' })
export class CvDraft {
  private readonly info = signal<CvInfo | null>(null);
  readonly current = this.info.asReadonly();

  save(info: CvInfo): void {
    this.info.set({ ...info });
  }
}
