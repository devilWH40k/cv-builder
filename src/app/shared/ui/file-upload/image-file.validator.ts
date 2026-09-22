import { AbstractControl, ValidationErrors } from '@angular/forms';

export function imageFileValidator(control: AbstractControl): ValidationErrors | null {
  const file: unknown = control.value;
  if (file === null) {
    return null;
  }
  return file instanceof File &&
    /\.(jpe?g|png)$/i.test(file.name) &&
    ['', 'image/jpeg', 'image/png'].includes(file.type)
      ? null
      : { imageType: true };
}
