import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { imageFileValidator } from '../../shared/ui/file-upload/image-file.validator';
import { CvLanguage } from '../cv/languages';

export function createLanguageForm(language?: CvLanguage) {
  return new FormGroup({
    language: new FormControl(language?.language ?? '', {
      nonNullable: true, validators: [Validators.required]
    }),
    level: new FormControl(language?.level ?? '', {
      nonNullable: true, validators: [Validators.required]
    })
  });
}

export function createCvForm() {
  return new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    positionTitle: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    photo: new FormControl<File | null>(null, { validators: [imageFileValidator] }),
    languages: new FormArray<ReturnType<typeof createLanguageForm>>([]),
    technologies: new FormControl<readonly string[]>([], { nonNullable: true })
  });
}
