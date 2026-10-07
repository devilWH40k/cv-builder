import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TriangleAlert, Download, LucideAngularModule, Upload, X } from 'lucide-angular';
import { Button } from '../../../../shared/ui/button/button';
import { Checkbox } from '../../../../shared/ui/checkbox/checkbox';
import { Input } from '../../../../shared/ui/input/input';
import { CvBackup, defaultBackupName } from '../../services/cv-backup';
import { Toasts } from '../../../../shared/ui/toast/toast';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-backup-dialog',
  imports: [Button, Input, Checkbox, ReactiveFormsModule, LucideAngularModule, Toasts],
  providers: [ToastService],
  templateUrl: './backup-dialog.html',
  styleUrl: './backup-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BackupDialog {
  private readonly backup = inject(CvBackup);
  private readonly toasts = inject(ToastService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  protected readonly DownloadIcon = Download;
  protected readonly UploadIcon = Upload;
  protected readonly CloseIcon = X;
  protected readonly CautionIcon = TriangleAlert;
  protected readonly wipePreviousData = new FormControl(false, { nonNullable: true });
  protected readonly fileName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(120),
      Validators.pattern(/^(?!\s*$)(?!\s*\.zip\s*$)[^<>:"/\\|?*\x00-\x1f]+$/i)]
  });
  protected readonly exportForm = new FormGroup({ fileName: this.fileName });
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly busy = signal<'import' | 'export' | null>(null);

  open(): void {
    if (this.dialog().nativeElement.open) return;
    this.fileName.reset(defaultBackupName());
    this.wipePreviousData.reset(false);
    this.fileInput().nativeElement.value = '';
    this.selectedFile.set(null);
    this.clearFeedback();
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    if (!this.busy()) this.dialog().nativeElement.close();
  }

  protected cancel(event: Event): void {
    if (this.busy()) event.preventDefault();
  }

  protected selectFile(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.selectedFile.set(event.target.files?.item(0) ?? null);
      this.clearFeedback();
    }
  }

  protected async importBackup(): Promise<void> {
    const file = this.selectedFile();
    if (!file || this.busy()) return;
    await this.run('import', async () => {
      const counts = await this.backup.import(file, this.wipePreviousData.value);
      this.toasts.show('success', `Imported ${counts.cvs} CV${counts.cvs === 1 ? '' : 's'}, ${counts.experiences} saved experience${counts.experiences === 1 ? '' : 's'} and ${counts.technologies} technolog${counts.technologies === 1 ? 'y' : 'ies'}.`);
      this.wipePreviousData.reset(false);
      this.selectedFile.set(null);
      this.fileInput().nativeElement.value = '';
    });
  }

  protected async exportBackup(): Promise<void> {
    this.fileName.markAsTouched();
    if (this.fileName.invalid || this.busy()) return;
    await this.run('export', async () => {
      await this.backup.export(this.fileName.value);
      this.toasts.show('success', 'Your backup download has started.');
    });
  }

  private clearFeedback(): void {
    for (const toast of this.toasts.messages()) this.toasts.dismiss(toast.id);
  }

  private async run(action: 'import' | 'export', operation: () => Promise<void>): Promise<void> {
    this.busy.set(action);
    this.fileName.disable();
    this.wipePreviousData.disable();
    this.clearFeedback();
    try {
      await operation();
    } catch (error: unknown) {
      this.toasts.show('danger', error instanceof Error ? error.message : 'The backup could not be processed. Please try again.');
    } finally {
      this.fileName.enable();
      this.wipePreviousData.enable();
      this.busy.set(null);
    }
  }
}
