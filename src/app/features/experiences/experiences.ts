import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { LucideAngularModule, Pencil, Plus, Trash2, Upload } from 'lucide-angular';
import { Table } from '../../shared/ui/table/table';
import { TableHeader } from '../../shared/ui/table/table-header';
import { TableRow } from '../../shared/ui/table/table-row';
import { TableCell } from '../../shared/ui/table/table-cell';
import { Button } from '../../shared/ui/button/button';
import { Tooltip } from '../../shared/directories/tooltip';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { SavedExperience } from '../cv/interfaces/experience';
import { SavedCvs } from '../cv/services/saved-cvs';
import { ExperienceDialog } from './components/experience-dialog/experience-dialog';
import { ExperienceImportDialog } from './components/experience-import-dialog/experience-import-dialog';
import { EXPERIENCE_TABLE_COLUMNS, experienceCell, experienceLink } from './experience-columns';

@Component({
  selector: 'app-experiences',
  imports: [Table, TableHeader, TableRow, TableCell, Button, Tooltip, LucideAngularModule, ExperienceDialog, ExperienceImportDialog],
  templateUrl: './experiences.html',
  styleUrl: './experiences.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Experiences {
  protected readonly records = signal<readonly SavedExperience[]>([]);
  protected readonly editing = signal<SavedExperience | null>(null);
  protected readonly adding = signal(false);
  protected readonly importing = signal(false);
  protected readonly deletingIds = signal<readonly string[]>([]);
  protected readonly deleteError = signal('');
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);
  protected readonly columns = EXPERIENCE_TABLE_COLUMNS;
  protected readonly headers = [...EXPERIENCE_TABLE_COLUMNS.map((column) => column.label), 'Actions'];
  protected readonly gridColumns = [
    'minmax(10rem, 1fr)', 'minmax(10rem, 1fr)', 'minmax(12rem, 1fr)',
    'minmax(14rem, 1fr)', 'minmax(14rem, 1fr)', '8rem', '8rem',
    'minmax(20rem, 2fr)', 'minmax(20rem, 2fr)',
    'minmax(14rem, 1fr)', 'minmax(10rem, 1fr)', 'minmax(10rem, 1fr)', '6rem', '8rem'
  ].join(' ');
  protected readonly EditIcon = Pencil;
  protected readonly DeleteIcon = Trash2;
  protected readonly AddIcon = Plus;
  protected readonly ImportIcon = Upload;
  protected readonly cell = experienceCell;
  protected readonly link = experienceLink;
  private readonly saved = inject(SavedCvs);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => void this.load());
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

  protected updated(record: SavedExperience): void {
    this.records.update((records) => records.some((entry) => entry.id === record.id)
      ? records.map((entry) => entry.id === record.id ? record : entry)
      : [record, ...records]);
    this.editing.set(null);
    this.adding.set(false);
  }

  protected imported(records: readonly SavedExperience[]): void {
    this.records.update((current) => [...records, ...current]);
    this.importing.set(false);
  }

  protected async deleteExperience(id: string): Promise<void> {
    if (this.deletingIds().includes(id)) return;
    this.deletingIds.update((ids) => [...ids, id]);
    this.deleteError.set('');
    try {
      await this.saved.deleteExperience(id);
      if (this.destroyRef.destroyed) return;
      this.records.update((records) => records.filter((record) => record.id !== id));
      this.toasts.show('success', 'Your experience has been deleted.');
    } catch {
      if (!this.destroyRef.destroyed) {
        this.deleteError.set('This experience could not be deleted. Please try again.');
        this.toasts.show('danger', this.deleteError());
      }
    } finally {
      if (!this.destroyRef.destroyed) this.deletingIds.update((ids) => ids.filter((entry) => entry !== id));
    }
  }
}
