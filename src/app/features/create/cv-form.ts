import { FormControl, FormGroup, Validators } from '@angular/forms';
import { imageFileValidator } from '../../shared/ui/file-upload/image-file.validator';

export function createCvForm() {
  return new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    positionTitle: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    photo: new FormControl<File | null>(null, { validators: [imageFileValidator] })
  });
}
