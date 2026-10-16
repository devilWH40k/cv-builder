import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CvDraft } from '../../../cv/services/cv-draft';
import { CvPdf } from '../../../cv/services/cv-pdf';
import { UniversitiesApi } from '../../data-access/universities-api';
import { Create } from './create';

describe('CV education section', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [Create],
    providers: [provideZonelessChangeDetection(), provideRouter([]),
      { provide: UniversitiesApi, useValue: { search: () => of([]) } }]
  }));

  it('places education after experience, updates preview, restores the draft, and removes entries', async () => {
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    const panels = Array.from(page.querySelectorAll('app-expand-panel')).map((panel) => panel.getAttribute('panelId'));
    expect(panels.slice(0, 3)).toEqual(['experience-panel', 'education-panel', 'languages-panel']);
    page.querySelector<HTMLButtonElement>('[aria-label="Add education"] button')!.click();
    await fixture.whenStable();
    const education = { university: 'Independent University', degree: 'Bachelor', field: 'Cybersecurity',
      startDate: '2018-09', endDate: '2022-06' };
    fixture.componentInstance.form.controls.education.at(0).patchValue(education);
    await fixture.whenStable();
    expect(TestBed.inject(CvDraft).current()?.education).toEqual([education]);
    const preview = page.querySelector('.cv-education')!;
    expect(preview.textContent).toContain('Independent University');
    expect(preview.textContent).toContain('Bachelor');
    expect(preview.textContent).toContain('Cybersecurity');
    expect(preview.textContent).toContain('September 2018');
    expect(preview.textContent).toContain('June 2022');
    fixture.destroy();

    const restored = TestBed.createComponent(Create);
    await restored.whenStable();
    expect(restored.componentInstance.form.controls.education.getRawValue()).toEqual([education]);
    const restoredPage: HTMLElement = restored.nativeElement;
    expect(restoredPage.querySelector<HTMLInputElement>('#university-0')!.value).toBe(education.university);
    expect(restoredPage.querySelector<HTMLSelectElement>('#education-degree-0')!.value).toBe('Bachelor');
    restoredPage.querySelector<HTMLButtonElement>('[aria-label="Remove education 1"]')!.click();
    await restored.whenStable();
    expect(TestBed.inject(CvDraft).current()?.education).toEqual([]);
    expect(restoredPage.querySelector('.cv-education')).toBeNull();
  });

  it('expands education and focuses invalid dates before exporting', async () => {
    const download = spyOn(TestBed.inject(CvPdf), 'download').and.resolveTo();
    spyOn(HTMLElement.prototype, 'scrollIntoView');
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    fixture.componentInstance.form.patchValue({ name: 'Alex', positionTitle: 'Engineer', description: 'Summary' });
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('[aria-label="Add education"] button')!.click();
    await fixture.whenStable();
    const form = fixture.componentInstance.form.controls.education.at(0);
    form.patchValue({ university: 'University', startDate: '2025', endDate: '2024' });
    page.querySelector<HTMLButtonElement>('#education-panel-heading')!.click();
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('.actions > app-button button')!.click();
    await fixture.whenStable();
    expect(page.querySelector<HTMLElement>('#education-panel')!.hidden).toBeFalse();
    expect(document.activeElement).toBe(page.querySelector('app-education-entry fieldset'));
    expect(download).not.toHaveBeenCalled();
    form.controls.endDate.setValue('2026');
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('.actions > app-button button')!.click();
    await fixture.whenStable();
    expect(download).toHaveBeenCalledWith(jasmine.objectContaining({ education: [form.getRawValue()] }));
  });
});
