import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { LucideAngularModule, Pencil, Plus, Trash2, Upload } from 'lucide-angular';
import { TableWrapper } from '../../shared/ui/table/table-wrapper/table-wrapper';
import { TableCellTemplate } from '../../shared/ui/table/directives/table-cell-template';
import { TableSettings } from '../../shared/ui/table/models/table-column';
import { Button } from '../../shared/ui/button/button';
import { DeleteConfirmationService } from '../../shared/ui/delete-confirmation/delete-confirmation.service';
import { Tooltip } from '../../shared/directories/tooltip';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { SavedExperience } from '../cv/interfaces/experience';
import { SavedCvs } from '../cv/services/saved-cvs';
import { ExperienceDialog } from './components/experience-dialog/experience-dialog';
import { ExperienceImportDialog } from './components/experience-import-dialog/experience-import-dialog';
import { EXPERIENCE_TABLE_COLUMNS, experienceLink } from './experience-columns';

@Component({
  selector: 'app-experiences',
  imports: [TableWrapper, TableCellTemplate, Button, Tooltip, LucideAngularModule, ExperienceDialog, ExperienceImportDialog],
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
  protected readonly tableSettings: TableSettings = {
    queryParams: true,
    search: true,
    searchLabel: 'Search experiences',
    emptyMessage: 'You have no saved experiences. Add an experience here or save one in the CV editor.'
  };
  protected readonly recordKey = (record: SavedExperience): string => record.id;
  protected readonly EditIcon = Pencil;
  protected readonly DeleteIcon = Trash2;
  protected readonly AddIcon = Plus;
  protected readonly ImportIcon = Upload;
  protected readonly link = experienceLink;
  private readonly saved = inject(SavedCvs);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmation = inject(DeleteConfirmationService);
  private loadId = 0;

  constructor() {
    const initialImportRevision = this.saved.importRevision();
    afterNextRender(() => void this.load());
    effect(() => {
      if (this.saved.importRevision() !== initialImportRevision) untracked(() => void this.load());
    });
  }

  protected async load(): Promise<void> {
    const loadId = ++this.loadId;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const records = await this.saved.listExperiences();
      if (!this.destroyRef.destroyed && loadId === this.loadId) this.records.set(records);
    } catch {
      if (!this.destroyRef.destroyed && loadId === this.loadId) {
        this.failed.set(true);
        this.toasts.show('danger', 'Saved experiences could not be loaded. Please try again.');
      }
    } finally {
      if (!this.destroyRef.destroyed && loadId === this.loadId) this.loading.set(false);
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
    const record = this.records().find((record) => record.id === id);
    if (!record || !await this.confirmation.confirm({
      title: 'Delete experience', itemName: record.experience.company,
      message: 'This removes the experience from your library. Copies already saved in CVs are kept.'
    }, this.destroyRef) || this.destroyRef.destroyed || this.deletingIds().includes(id)) return;
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
