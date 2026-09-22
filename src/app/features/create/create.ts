import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { Input } from '../../shared/ui/input/input';
import { Textarea } from '../../shared/ui/textarea/textarea';
import { FileUpload } from '../../shared/ui/file-upload/file-upload';
import { Button } from '../../shared/ui/button/button';
import { createCvForm } from './cv-form';

@Component({
  selector: 'app-create',
  imports: [RouterLink, ReactiveFormsModule, Input, Textarea, FileUpload, Button],
  templateUrl: './create.html',
  styleUrl: './create.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Create {
  readonly form = createCvForm();

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    console.log('CV info', this.form.getRawValue());
  }
}
