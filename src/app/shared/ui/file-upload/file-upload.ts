import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { LucideAngularModule, Upload, UserRound } from 'lucide-angular';
import { FormField } from '../form-field/form-field';
import { imageFileValidator } from './image-file.validator';
import { FormControl } from '@angular/forms';
import { PhotoPreview } from '../photo-preview/photo-preview';

@Component({
  selector: 'app-file-upload',
  imports: [LucideAngularModule, PhotoPreview],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileUpload extends FormField<File | null> {
  protected readonly UploadIcon = Upload;
  protected readonly UserIcon = UserRound;
  protected readonly pendingPhoto = signal<File | null>(null);
  protected readonly previewUrl = signal<string | null>(null);

  constructor() {
    super();
    effect(() => { if (this.disabled()) this.pendingPhoto.set(null); });
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
    if (this.disabled()) return;
    input.value = '';
    if (imageFileValidator(new FormControl(file))) {
      this.applyPhoto(file);
      return;
    }
    this.pendingPhoto.set(file);
  }

  protected applyPhoto(file: File): void {
    this.pendingPhoto.set(null);
    if (this.disabled()) return;
    this.control().setValue(file);
    this.control().markAsDirty();
    this.control().markAsTouched();
  }
}
