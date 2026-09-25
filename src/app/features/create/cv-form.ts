import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { imageFileValidator } from '../../shared/ui/file-upload/image-file.validator';
import { CvLanguage } from '../cv/languages';
import { CvExperience } from '../cv/experience';
import { parseCalendarDate } from '../../shared/ui/date-picker/date-value';

export function createExperienceForm(experience?: CvExperience) {
  const form = new FormGroup({
    company: new FormControl(experience?.company ?? '', {
      nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)]
    }),
    position: new FormControl(experience?.position ?? '', { nonNullable: true }),
    startDate: new FormControl(experience?.startDate ?? '', { nonNullable: true }),
    endDate: new FormControl(experience?.endDate ?? '', { nonNullable: true }),
    isCurrent: new FormControl(experience?.isCurrent ?? false, { nonNullable: true }),
    technologies: new FormControl<readonly string[]>(experience?.technologies ?? [], { nonNullable: true }),
    description: new FormControl(experience?.description ?? '', { nonNullable: true })
  });
  form.addValidators(() => {
    const { startDate, endDate, isCurrent } = form.getRawValue();
    const start = parseCalendarDate(startDate);
    const end = parseCalendarDate(endDate);
    if ((startDate && !start) || (!isCurrent && endDate && !end)) return { invalidDate: true };
    const precision = Math.min(startDate.length, endDate.length);
    return !isCurrent && start && end &&
      startDate.slice(0, precision) > endDate.slice(0, precision) ? { dateOrder: true } : null;
  });
  return form;
}


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
    experiences: new FormArray<ReturnType<typeof createExperienceForm>>([]),
    technologies: new FormControl<readonly string[]>([], { nonNullable: true })
  });
}
