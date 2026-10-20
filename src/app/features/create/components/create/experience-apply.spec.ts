import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Create } from './create';
import { CvDraft } from '../../../cv/services/cv-draft';
import { SavedCvs } from '../../../cv/services/saved-cvs';
import { SavedExperience } from '../../../cv/interfaces/experience';
import { createExperienceForm } from '../../helpers/cv-form';

describe('Applying updated library experiences', () => {
  const original = {
    savedExperienceId: 'linked', company: 'Old company', position: 'Developer',
    startDate: '2020', endDate: '', isCurrent: true, technologies: ['Angular'],
    description: '<p>Old description</p>', webLink: 'https://example.com', developer: 'Ada'
  };
  const updated: SavedExperience = {
    id: 'linked', updatedAt: 2, experience: {
      company: 'New company', position: 'Lead', startDate: '2021', endDate: '2024',
      isCurrent: false, technologies: ['TypeScript'], description: '<p>New description</p>',
      responsibilities: 'New responsibilities'
    }
  };
  const added: SavedExperience = { ...updated, id: 'new', experience: { ...updated.experience, company: 'New entry' } };

  async function setup() {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
    spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.resolveTo([updated, added]);
    const draft = TestBed.inject(CvDraft);
    draft.save({ name: 'Ada', positionTitle: '', description: '', photo: null,
      languages: [], technologies: [], experiences: [original, { ...original, savedExperienceId: 'untouched' }] });
    const fixture = TestBed.createComponent(Create);
    await fixture.whenStable();
    fixture.componentInstance.form.controls.name.setValue('Unsaved name');
    fixture.nativeElement.querySelector('[aria-label="Load experiences"] button').click();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('dialog[aria-labelledby="experiences-title"]')!;
    return { fixture, draft, dialog };
  }

  it('replaces a linked entry, clears stale fields, and adds new entries without moving or duplicating existing rows', async () => {
    const { fixture, draft, dialog } = await setup();
    const form = fixture.componentInstance.form;
    const linkedRow = form.controls.experiences.at(0);
    const untouched = form.controls.experiences.at(1).getRawValue();
    dialog.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => checkbox.click());
    await fixture.whenStable();
    dialog.querySelector<HTMLButtonElement>('footer app-button button')!.click();
    await fixture.whenStable();
    expect(form.controls.experiences.length).toBe(3);
    expect(form.controls.experiences.at(0)).toBe(linkedRow);
    expect(linkedRow.getRawValue()).toEqual(createExperienceForm({ ...updated.experience,
      description: '<p>New description</p><p>New responsibilities</p>', savedExperienceId: updated.id }).getRawValue());
    expect(form.controls.experiences.at(1).getRawValue()).toEqual(untouched);
    expect(form.controls.experiences.at(2).controls.savedExperienceId.value).toBe(added.id);
    expect(form.controls.name.value).toBe('Unsaved name');
    expect(draft.current()?.experiences[0].company).toBe('New company');
    expect(draft.hasUnsavedChanges()).toBeTrue();
    expect(updated.experience.description).toBe('<p>New description</p>');
  });

  it('leaves the CV unchanged when a selected update is cancelled', async () => {
    const { fixture, draft, dialog } = await setup();
    const before = fixture.componentInstance.form.getRawValue();
    const snapshot = draft.current();
    dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await fixture.whenStable();
    dialog.querySelector<HTMLButtonElement>('.cancel')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.getRawValue()).toEqual(before);
    expect(draft.current()).toBe(snapshot);
  });
});
