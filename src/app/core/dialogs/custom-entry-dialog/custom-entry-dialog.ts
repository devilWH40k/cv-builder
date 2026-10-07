import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, PendingTasks, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from '../../../shared/ui/button/button';
import { DialogOverlay } from '../../../shared/ui/dialog/dialog-overlay';
import { Input } from '../../../shared/ui/input/input';
import { normalizeEntryIcon } from './custom-entry-icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FileUpload } from '../../../shared/ui/file-upload/file-upload';

export interface CustomEntry {
  readonly name: string;
  readonly icon?: string;
}

@Component({
  selector: 'app-custom-entry-dialog',
  imports: [ReactiveFormsModule, Button, DialogOverlay, Input, FileUpload],
  templateUrl: './custom-entry-dialog.html',
  styleUrl: './custom-entry-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomEntryDialog {
  readonly inputId = input.required<string>();
  readonly applied = output<CustomEntry>();
  readonly cancelled = output<void>();
  readonly saveEntry = input<((entry: CustomEntry) => Promise<CustomEntry>) | null>(null);
  readonly saveOnApply = input(false);
  protected readonly name = new FormControl('', {
    nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)]
  });
  protected readonly icon = signal<string | undefined>(undefined);
  protected readonly iconFile = new FormControl<File | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly saveError = signal('');
  private readonly overlay = viewChild.required(DialogOverlay);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pending = inject(PendingTasks);
  private uploadId = 0;

  constructor() {
    this.iconFile.valueChanges.pipe(takeUntilDestroyed()).subscribe((file) => void this.selectIcon(file));
    afterNextRender(() => this.overlay().open());
  }

  private async selectIcon(file: File | null): Promise<void> {
    const uploadId = ++this.uploadId;
    this.icon.set(undefined);
    this.error.set('');
    this.loading.set(!!file);
    if (!file) return;
    const done = this.pending.add();
    try {
      const icon = await normalizeEntryIcon(file);
      if (!this.destroyRef.destroyed && uploadId === this.uploadId) this.icon.set(icon);
    } catch (error: unknown) {
      if (!this.destroyRef.destroyed && uploadId === this.uploadId) {
        this.error.set(error instanceof Error ? error.message : 'This image could not be read.');
        this.iconFile.setErrors({ icon: true });
      }
    } finally {
      if (!this.destroyRef.destroyed && uploadId === this.uploadId) this.loading.set(false);
      done();
    }
  }

  protected clearIcon(): void {
    this.iconFile.reset();
  }

  protected apply(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.saveOnApply()) {
      void this.applyAndSave();
      return;
    }
    this.name.markAsTouched();
    if (this.name.invalid || this.loading() || this.error() || this.saving()) return;
    this.overlay().close();
    this.applied.emit({ name: this.name.value.trim(), ...(this.icon() ? { icon: this.icon() } : {}) });
  }

  protected cancel(): void {
    if (this.saving()) return;
    this.overlay().close();
    this.cancelled.emit();
  }

  protected async applyAndSave(): Promise<void> {
    this.name.markAsTouched();
    const save = this.saveEntry();
    if (!save || this.name.invalid || this.loading() || this.error() || this.saving()) return;
    this.saving.set(true);
    this.saveError.set('');
    const entry: CustomEntry = { name: this.name.value.trim(), ...(this.icon() ? { icon: this.icon() } : {}) };
    this.name.disable({ emitEvent: false });
    this.iconFile.disable({ emitEvent: false });
    const done = this.pending.add();
    try {
      const saved = await save(entry);
      if (this.destroyRef.destroyed) return;
      this.overlay().close();
      this.applied.emit(saved);
    } catch {
      if (!this.destroyRef.destroyed) this.saveError.set('This entry could not be saved. Please try again.');
    } finally {
      if (!this.destroyRef.destroyed) {
        this.saving.set(false);
        this.name.enable({ emitEvent: false });
        this.iconFile.enable({ emitEvent: false });
      }
      done();
    }
  }
}
