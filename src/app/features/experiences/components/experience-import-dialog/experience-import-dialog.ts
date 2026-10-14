import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, output, PendingTasks, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { Download, LucideAngularModule } from 'lucide-angular';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { FileUpload } from '../../../../shared/ui/file-upload/file-upload';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { CvExperience, SavedExperience } from '../../../cv/interfaces/experience';
import { SavedCvs } from '../../../cv/services/saved-cvs';
import type { ExperienceImportMessage } from '../../helpers/experience-excel';
import { ExperienceExcel } from '../../services/experience-excel';

@Component({
  selector: 'app-experience-import-dialog',
  imports: [Button, Dialog, FileUpload, LucideAngularModule],
  templateUrl: './experience-import-dialog.html',
  styleUrl: './experience-import-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExperienceImportDialog {
  readonly applied = output<readonly SavedExperience[]>();
  readonly cancelled = output<void>();
  protected readonly file = new FormControl<File | null>(null);
  protected readonly report = signal<readonly ExperienceImportMessage[]>([]);
  protected readonly experiences = signal<readonly CvExperience[]>([]);
  protected readonly parsing = signal(false);
  protected readonly applying = signal(false);
  protected readonly downloading = signal(false);
  protected readonly canApply = computed(() => !this.parsing() && !this.applying() && this.experiences().length > 0);
  protected readonly DownloadIcon = Download;
  private readonly excel = inject(ExperienceExcel);
  private readonly saved = inject(SavedCvs);
  private readonly toasts = inject(ToastService);
  private readonly pending = inject(PendingTasks);
  private readonly destroyRef = inject(DestroyRef);
  private parseId = 0;

  constructor() {
    // Control enable/disable events must preserve the parsed batch while Apply is running.
    this.file.valueChanges.pipe(takeUntilDestroyed()).subscribe((file) => {
      if (!this.applying()) void this.parse(file);
    });
  }

  private async parse(file: File | null): Promise<void> {
    const parseId = ++this.parseId;
    this.experiences.set([]);
    this.report.set([]);
    this.parsing.set(!!file);
    if (!file) return;
    const done = this.pending.add();
    try {
      const result = await this.excel.parse(file);
      if (this.destroyRef.destroyed || parseId !== this.parseId) return;
      this.experiences.set(result.experiences);
      this.report.set(result.report);
    } catch (error: unknown) {
      if (!this.destroyRef.destroyed && parseId === this.parseId) {
        this.file.setErrors({ excel: true });
        this.report.set([{ type: 'error', message: `File could not be parsed: ${error instanceof Error ? error.message : 'The workbook could not be read.'}` }]);
      }
    } finally {
      if (!this.destroyRef.destroyed && parseId === this.parseId) this.parsing.set(false);
      done();
    }
  }

  protected async apply(): Promise<void> {
    if (!this.canApply()) return;
    this.applying.set(true);
    this.file.disable();
    const done = this.pending.add();
    try {
      const records = await this.saved.importExperiences(this.experiences());
      if (this.destroyRef.destroyed) return;
      this.toasts.show('success', `Imported ${records.length} experience${records.length === 1 ? '' : 's'}.`);
      this.applied.emit(records);
    } catch {
      if (!this.destroyRef.destroyed) {
        this.report.update((report) => [...report, { type: 'error',
          message: 'Experiences could not be saved. No records were added. Please try Apply again.' }]);
      }
    } finally {
      if (!this.destroyRef.destroyed) {
        this.file.enable();
        this.applying.set(false);
      }
      done();
    }
  }

  protected async downloadTemplate(): Promise<void> {
    if (this.downloading() || this.applying()) return;
    this.downloading.set(true);
    const done = this.pending.add();
    try { await this.excel.downloadTemplate(); }
    catch {
      if (!this.destroyRef.destroyed) this.report.update((report) => [...report,
        { type: 'error', message: 'The template could not be downloaded. Please try again.' }]);
    } finally {
      if (!this.destroyRef.destroyed) this.downloading.set(false);
      done();
    }
  }
}
