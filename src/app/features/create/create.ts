import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { Input } from '../../shared/ui/input/input';
import { Textarea } from '../../shared/ui/textarea/textarea';
import { FileUpload } from '../../shared/ui/file-upload/file-upload';
import { Button } from '../../shared/ui/button/button';
import { createCvForm } from './cv-form';
import { CvDraft } from '../cv/cv-draft';

@Component({
  selector: 'app-create',
  imports: [RouterLink, ReactiveFormsModule, Input, Textarea, FileUpload, Button],
  templateUrl: './create.html',
  styleUrl: './create.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Create {
  private readonly draft = inject(CvDraft);
  private readonly router = inject(Router);
  readonly form = createCvForm();

  constructor() {
    const info = this.draft.current();
    if (info) {
      this.form.setValue(info);
    }
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    this.draft.save(this.form.getRawValue());
    void this.router.navigate(['/preview']);
  }
}
