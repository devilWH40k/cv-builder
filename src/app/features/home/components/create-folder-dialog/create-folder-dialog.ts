import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, PendingTasks, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Input } from '../../../../shared/ui/input/input';
import { SavedCvs } from '../../../cv/services/saved-cvs';

@Component({
  selector: 'app-create-folder-dialog',
  imports: [Button, Dialog, Input, ReactiveFormsModule],
  templateUrl: './create-folder-dialog.html',
  styleUrl: './create-folder-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateFolderDialog {
  readonly applied = output<void>();
  readonly cancelled = output<void>();
  protected readonly name = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)]
  });
  protected readonly form = new FormGroup({ name: this.name });
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  private readonly saved = inject(SavedCvs);
  private readonly pending = inject(PendingTasks);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild.required(Dialog);

  protected cancelPointerDown(event: PointerEvent): void {
    if (event.button === 0) event.preventDefault();
  }

  protected cancel(): void {
    if (!this.saving()) this.dialog().close();
  }

  protected async apply(): Promise<void> {
    this.name.markAsTouched();
    if (this.name.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const name = this.name.value;
    this.name.disable({ emitEvent: false });
    const done = this.pending.add();
    try {
      await this.saved.createFolder(name);
      if (!this.destroyRef.destroyed) this.applied.emit();
    } catch {
      if (!this.destroyRef.destroyed) this.error.set('This folder could not be created. Please try again.');
    } finally {
      if (!this.destroyRef.destroyed) {
        this.saving.set(false);
        this.name.enable({ emitEvent: false });
      }
      done();
    }
  }
}
