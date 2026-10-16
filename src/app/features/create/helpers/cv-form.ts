import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { CvSocialLink, emailValidator, phoneValidator, socialLink, SOCIAL_NETWORKS } from '../../cv/helpers/cv-contact';
import { imageFileValidator } from '../../../shared/ui/file-upload/image-file.validator';
import { CvLanguage } from '../../cv/constants/languages';
import { CvExperience } from '../../cv/interfaces/experience';
import { parseCalendarDate } from '../../../shared/ui/date-picker/date-value';
import { CustomEntryIcons } from '../../../core/dialogs/custom-entry-dialog/custom-entry-icon';
import { CvEducation } from '../../cv/interfaces/education';

export function createEducationForm(education?: CvEducation) {
  const form = new FormGroup({
    university: new FormControl(education?.university ?? '', {
      nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)]
    }),
    degree: new FormControl(education?.degree ?? '', { nonNullable: true }),
    field: new FormControl(education?.field ?? '', { nonNullable: true }),
    startDate: new FormControl(education?.startDate ?? '', { nonNullable: true }),
    endDate: new FormControl(education?.endDate ?? '', { nonNullable: true })
  });
  form.addValidators(() => {
    const { startDate, endDate } = form.getRawValue();
    const start = parseCalendarDate(startDate);
    const end = parseCalendarDate(endDate);
    if ((startDate && !start) || (endDate && !end)) return { invalidDate: true };
    const precision = Math.min(startDate.length, endDate.length);
    return start && end && startDate.slice(0, precision) > endDate.slice(0, precision)
      ? { dateOrder: true } : null;
  });
  form.updateValueAndValidity();
  return form;
}

export function createSocialForm(entry?: CvSocialLink) {
  const form = new FormGroup({
    network: new FormControl(entry?.network ?? '', { nonNullable: true, validators: [Validators.required,
      (control) => SOCIAL_NETWORKS.some((network) => network.name === control.value) ? null : { network: true }] }),
    value: new FormControl(entry ? socialLink(entry)?.text ?? entry.value : '', { nonNullable: true, validators: [Validators.required] }),
  });
  form.controls.value.addValidators(() => socialLink(form.getRawValue()) ? null : { social: true });
  form.controls.value.updateValueAndValidity();
  return form;
}

export type ContactForm = ReturnType<typeof createCvForm>['controls']['contact'];

export function createExperienceForm(experience?: CvExperience) {
  const form = new FormGroup({
    alternativeNames: new FormControl(experience?.alternativeNames ?? '', { nonNullable: true }),
    webLink: new FormControl(experience?.webLink ?? '', { nonNullable: true }),
    photos: new FormControl(experience?.photos ?? '', { nonNullable: true }),
    responsibilities: new FormControl(experience?.responsibilities ?? '', { nonNullable: true }),
    teamlead: new FormControl(experience?.teamlead ?? '', { nonNullable: true }),
    developer: new FormControl(experience?.developer ?? '', { nonNullable: true }),
    isUpdated: new FormControl<boolean | null>(experience?.isUpdated ?? null),
    customTechnologyIcons: new FormControl<CustomEntryIcons>(experience?.customTechnologyIcons ?? {}, { nonNullable: true }),
    savedExperienceId: new FormControl<string | null>(experience?.savedExperienceId ?? null),
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
    contact: new FormGroup({
      phone: new FormControl('', { nonNullable: true, validators: [phoneValidator] }),
      email: new FormControl('', { nonNullable: true, validators: [emailValidator] }),
      socials: new FormArray<ReturnType<typeof createSocialForm>>([]),
    }),
    customTechnologyIcons: new FormControl<CustomEntryIcons>({}, { nonNullable: true }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    positionTitle: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/)] }),
    photo: new FormControl<File | null>(null, { validators: [imageFileValidator] }),
    languages: new FormArray<ReturnType<typeof createLanguageForm>>([]),
    experiences: new FormArray<ReturnType<typeof createExperienceForm>>([]),
    education: new FormArray<ReturnType<typeof createEducationForm>>([]),
    technologies: new FormControl<readonly string[]>([], { nonNullable: true })
  });
}
