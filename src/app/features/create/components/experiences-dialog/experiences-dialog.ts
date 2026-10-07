import { FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import { Input } from '../../../../shared/ui/input/input';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal, viewChild } from '@angular/core';
import { Button } from '../../../../shared/ui/button/button';
import { DialogOverlay } from '../../../../shared/ui/dialog/dialog-overlay';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { SavedCvs } from '../../../cv/services/saved-cvs';
import { SavedExperience } from '../../../cv/interfaces/experience';

@Component({
  selector: 'app-experiences-dialog',
  imports: [Button, DialogOverlay, Input],
  templateUrl: './experiences-dialog.html',
  styleUrl: './experiences-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExperiencesDialog {
  readonly linkedIds = input<readonly string[]>([]);
  readonly applied = output<readonly SavedExperience[]>();
  readonly cancelled = output<void>();
  protected readonly records = signal<readonly SavedExperience[]>([]);
  protected readonly selected = signal<readonly string[]>([]);
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly page = signal(1);
  private readonly pageSize = 6;
  private readonly query = toSignal(this.search.valueChanges.pipe(tap(() => this.page.set(1))), { initialValue: '' });
  protected readonly filtered = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    return this.records().filter(({ experience }) =>
      experience.company.toLocaleLowerCase().includes(query) || experience.position.toLocaleLowerCase().includes(query));
  });
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  protected readonly visibleRecords = computed(() => this.filtered().slice(
    (this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  private readonly saved = inject(SavedCvs);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly overlay = viewChild.required(DialogOverlay);

  constructor() {
    afterNextRender(() => { this.overlay().open(); void this.load(); });
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);
    try {
      const records = await this.saved.listExperiences();
      if (!this.destroyRef.destroyed) this.records.set(records);
    } catch {
      if (!this.destroyRef.destroyed) {
        this.failed.set(true);
        this.toasts.show('danger', 'Saved experiences could not be loaded. Please try again.');
      }
    } finally {
      if (!this.destroyRef.destroyed) this.loading.set(false);
    }
  }

  protected changePage(page: number): void {
    this.page.set(Math.max(1, Math.min(page, this.pageCount())));
  }

  protected toggle(id: string): void {
    this.selected.update((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);
  }

  protected cancel(): void { this.overlay().close(); this.cancelled.emit(); }

  protected apply(): void {
    if (this.loading() || this.failed() || !this.selected().length) return;
    this.overlay().close();
    this.applied.emit(this.records().filter((record) => this.selected().includes(record.id)));
  }
}
