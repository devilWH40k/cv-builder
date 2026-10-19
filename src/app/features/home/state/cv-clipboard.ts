import { computed, inject, Injectable, signal } from '@angular/core';
import { SavedCvs } from '../../cv/services/saved-cvs';

@Injectable({ providedIn: 'root' })
export class CvClipboard {
  private readonly saved = inject(SavedCvs);
  private readonly selectedId = signal<string | null>(null);
  readonly cutId = computed(() => this.saved.all().some((cv) => cv.id === this.selectedId()) ? this.selectedId() : null);

  cut(id: string): void {
    if (this.saved.all().some((cv) => cv.id === id)) this.selectedId.set(id);
  }

  clear(id: string): void {
    if (this.selectedId() === id) this.selectedId.set(null);
  }
}
