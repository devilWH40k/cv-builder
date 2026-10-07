import { createExperienceForm } from './cv-form';

describe('Experience validation', () => {
  it('requires company and accepts an optional position', () => {
    const form = createExperienceForm();
    expect(form.invalid).toBeTrue();
    form.controls.company.setValue('   ');
    expect(form.invalid).toBeTrue();
    form.controls.company.setValue('FINBIT');
    expect(form.valid).toBeTrue();
  });

  it('rejects reversed periods, but ignores the end date for current work', () => {
    const form = createExperienceForm();
    form.patchValue({ company: 'FINBIT', startDate: '2024-06', endDate: '2023-06' });
    expect(form.hasError('dateOrder')).toBeTrue();
    form.controls.isCurrent.setValue(true);
    expect(form.valid).toBeTrue();
    form.controls.isCurrent.setValue(false);
    form.controls.endDate.setValue('2024-06');
    expect(form.valid).toBeTrue();
    form.controls.endDate.setValue('2024');
    expect(form.valid).toBeTrue();
    form.controls.startDate.setValue('2024-02-30');
    expect(form.hasError('invalidDate')).toBeTrue();
  });
});
