import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Guides } from '../../../guides/guides';
import { ExperienceEntry } from './experience-entry';
import { createExperienceForm } from '../../helpers/cv-form';
import { SavedCvs } from '../../../cv/services/saved-cvs';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ThemeStore } from '../../../../core/theme/theme-store';
import { CvDraft } from '../../../cv/services/cv-draft';

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

  it('updates the rich-text editor theme while preserving the description', async () => {
    const originalTheme = document.documentElement.dataset['theme'];
    spyOn(Storage.prototype, 'getItem').and.returnValue('light');
    spyOn(Storage.prototype, 'setItem').and.stub();
    try {
      const { fixture, form } = await setup();
      form.controls.description.setValue('<p>Project work in progress</p>');
      await fixture.whenStable();
      TestBed.inject(ThemeStore).toggleTheme();
      await fixture.whenStable();
      const editor: HTMLElement = fixture.nativeElement.querySelector('angular-tiptap-editor');
      expect(editor.classList.contains('dark')).toBeTrue();
      expect(editor.querySelector('.ProseMirror')?.textContent).toBe('Project work in progress');
      expect(form.controls.description.value).toBe('<p>Project work in progress</p>');
    } finally {
      if (originalTheme === undefined) delete document.documentElement.dataset['theme'];
      else document.documentElement.dataset['theme'] = originalTheme;
    }
  });

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

  it('saves the current CV link and clears only the saved experience changes', async () => {
    const save = spyOn(TestBed.inject(SavedCvs), 'saveExperience').and.resolveTo('library-1');
    const { fixture, form, button } = await setup();
    form.patchValue({ company: 'Original', savedExperienceId: 'library-1' });
    const draft = TestBed.inject(CvDraft);
    const info = { name: 'Ada', positionTitle: '', description: '', photo: null,
      languages: [], technologies: [], experiences: [form.getRawValue()] };
    draft.savedId.set('cv-1');
    draft.beginEditing(info);
    form.controls.company.setValue('Updated');
    draft.save({ ...info, name: 'Unsaved name', experiences: [form.getRawValue()] });
    button.click();
    await fixture.whenStable();
    expect(save).toHaveBeenCalledWith(jasmine.objectContaining({ company: 'Updated' }), 'cv-1');
    expect(draft.hasUnsavedChanges()).toBeTrue();
    draft.save({ ...info, experiences: [form.getRawValue()] });
    expect(draft.hasUnsavedChanges()).toBeFalse();
  });

  it('keeps edits made during an experience save unsaved', async () => {
    let complete!: (id: string) => void;
    spyOn(TestBed.inject(SavedCvs), 'saveExperience').and.returnValue(new Promise((resolve) => { complete = resolve; }));
    const { fixture, form, button } = await setup();
    form.patchValue({ company: 'Original', savedExperienceId: 'library-1' });
    const draft = TestBed.inject(CvDraft);
    const info = { name: 'Ada', positionTitle: '', description: '', photo: null,
      languages: [], technologies: [], experiences: [form.getRawValue()] };
    draft.savedId.set('cv-1');
    draft.beginEditing(info);
    form.controls.company.setValue('Saving');
    button.click();
    form.controls.company.setValue('Newer edit');
    draft.save({ ...info, experiences: [form.getRawValue()] });
    complete('library-1');
    await fixture.whenStable();
    expect(form.controls.company.value).toBe('Newer edit');
    expect(draft.hasUnsavedChanges()).toBeTrue();
    draft.save({ ...info, experiences: [{ ...form.getRawValue(), company: 'Saving' }] });
    expect(draft.hasUnsavedChanges()).toBeFalse();
  });

  it('opens the experience guide from the Save hint without saving an experience', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'guides', component: Guides }])] });
    const harness = await RouterTestingHarness.create();
    const save = spyOn(TestBed.inject(SavedCvs), 'saveExperience');
    const { button } = await setup();
    button.focus();
    const hint = document.getElementById(button.getAttribute('aria-describedby')!)!;
    expect(hint.textContent).toBe('Save an experience to a storage for future use more');
    hint.querySelector('a')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/guides?guide=manage-experiences-guide');
    expect(harness.routeNativeElement!.querySelector('#manage-experiences-guide-heading')!
      .getAttribute('aria-expanded')).toBe('true');
    expect(save).not.toHaveBeenCalled();
  });
});
