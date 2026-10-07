import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ExperienceEntry } from './experience-entry';
import { createExperienceForm } from '../../helpers/cv-form';
import { SavedCvs } from '../../../cv/services/saved-cvs';
import { ToastService } from '../../../../shared/ui/toast/toast.service';

describe('Save experience', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  async function setup() {
    const fixture = TestBed.createComponent(ExperienceEntry);
    const form = createExperienceForm();
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('index', 0);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-label="Save experience 1"]');
    return { fixture, form, button };
  }

  it('validates, stores the returned ID, and uses it on subsequent saves', async () => {
    const save = spyOn(TestBed.inject(SavedCvs), 'saveExperience').and.resolveTo('saved-1');
    const { fixture, form, button } = await setup();
    button.click();
    expect(save).not.toHaveBeenCalled();
    expect(form.controls.company.touched).toBeTrue();
    form.controls.company.setValue('Example');
    button.click();
    await fixture.whenStable();
    expect(form.controls.savedExperienceId.value).toBe('saved-1');
    expect(TestBed.inject(ToastService).messages().at(-1)?.theme).toBe('success');
    button.click();
    await fixture.whenStable();
    expect(save.calls.mostRecent().args[0].savedExperienceId).toBe('saved-1');
  });

  it('retains an unsaved entry and reports failed writes', async () => {
    spyOn(TestBed.inject(SavedCvs), 'saveExperience').and.rejectWith(new Error('Quota exceeded'));
    const { fixture, form, button } = await setup();
    form.controls.company.setValue('Example');
    button.click();
    await fixture.whenStable();
    expect(form.controls.savedExperienceId.value).toBeNull();
    expect(form.controls.company.value).toBe('Example');
    expect(button.disabled).toBeFalse();
    expect(TestBed.inject(ToastService).messages().at(-1)?.theme).toBe('danger');
  });
});
