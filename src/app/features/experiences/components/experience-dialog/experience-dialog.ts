import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { Button } from '../../../../shared/ui/button/button';
import { Input } from '../../../../shared/ui/input/input';
import { Textarea } from '../../../../shared/ui/textarea/textarea';
import { Radio } from '../../../../shared/ui/radio/radio';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ExperienceEntry } from '../../../create/components/experience-entry/experience-entry';
import { createExperienceForm } from '../../../create/helpers/cv-form';
import { SavedExperience } from '../../../cv/interfaces/experience';
import { SavedCvs } from '../../../cv/services/saved-cvs';
import { EXPERIENCE_COLUMNS, experienceCell } from '../../experience-columns';

@Component({
  selector: 'app-experience-dialog',
  imports: [ReactiveFormsModule, Dialog, Button, Input, Textarea, Radio, ExperienceEntry],
  templateUrl: './experience-dialog.html',
  styleUrl: './experience-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExperienceDialog implements OnInit {
  readonly record = input<SavedExperience | null>(null);
  readonly readOnly = input(false);
  readonly saved = output<SavedExperience>();
  readonly cancelled = output<void>();
  protected readonly form = createExperienceForm();
  protected readonly saving = signal(false);
  protected readonly columns = EXPERIENCE_COLUMNS;
  protected readonly cell = experienceCell;
  protected readonly title = computed(() => this.readOnly() ? 'Experience details'
    : this.record() ? 'Update experience' : 'Add experience');
  private readonly storage = inject(SavedCvs);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    const record = this.record();
    if (record) this.form.patchValue({ ...record.experience, savedExperienceId: record.id });
    if (this.readOnly()) this.form.disable();
  }

  protected async save(): Promise<void> {
    if (this.readOnly() || this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toasts.show('alert', 'Please correct the experience fields before saving.');
      return;
    }
    const experience = {
      ...this.record()?.experience, ...this.form.getRawValue(), savedExperienceId: this.record()?.id ?? null
    };
    this.saving.set(true);
    this.form.disable();
    try {
      const id = await this.storage.saveExperience(experience);
      if (this.destroyRef.destroyed) return;
      this.toasts.show('success', this.record() ? 'Your experience has been updated.' : 'Your experience has been added.');
      this.saved.emit({ id, experience: { ...experience, savedExperienceId: id }, updatedAt: Date.now() });
    } catch {
      if (!this.destroyRef.destroyed) {
        this.toasts.show('danger', 'Your experience could not be saved. Please try again.');
      }
    } finally {
      if (!this.destroyRef.destroyed) {
        this.saving.set(false);
        this.form.enable();
      }
    }
  }
}
