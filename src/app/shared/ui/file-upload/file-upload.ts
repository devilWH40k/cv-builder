import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { LucideAngularModule, Upload, UserRound } from 'lucide-angular';
import { FormField } from '../form-field/form-field';
import { imageFileValidator } from './image-file.validator';

@Component({
  selector: 'app-file-upload',
  imports: [LucideAngularModule],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileUpload extends FormField<File | null> {
  protected readonly UploadIcon = Upload;
  protected readonly UserIcon = UserRound;
  protected readonly previewUrl = signal<string | null>(null);

  constructor() {
    super();
    effect((onCleanup) => {
      const file = this.value();
      if (!file || imageFileValidator(this.control())) {
        this.previewUrl.set(null);
        return;
      }

      const url = URL.createObjectURL(file);
      this.previewUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }

  protected selectFile(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const file = input.files?.item(0);
    if (!file) {
      return;
    }
    this.control().setValue(file);
    this.control().markAsDirty();
    this.control().markAsTouched();
    input.value = '';
  }
}
