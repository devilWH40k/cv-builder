import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExperienceEntry } from '../create/experience-entry/experience-entry';
import { createExperienceForm } from '../create/cv-form';
import { Preview } from '../preview/preview';
import { CvDraft } from './cv-draft';
import { TECHNOLOGY_GROUPS } from './technologies';
import { USED_TECHNOLOGY_GROUPS, USED_TECHNOLOGY_ICONS } from './used-technologies';

describe('Project technologies', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [ExperienceEntry, Preview],
    providers: [provideZonelessChangeDetection(), provideRouter([])]
  }));

  it('offers only icon-backed technologies while preserving the general catalog', () => {
    const options = USED_TECHNOLOGY_GROUPS.flatMap((group) => group.options);
    expect(new Set(options).size).toBe(options.length);
    expect(options.length).toBe(23);
    for (const name of options) expect(USED_TECHNOLOGY_ICONS[name]).toMatch(/^used-tech-icons\/.+\.svg$/);
    expect(options).toContain('Stripe');
    expect(options).toContain('SignalR');
    expect(options).toContain('Chart.js');
    expect(options.map(String)).not.toContain('React');
    const general = TECHNOLOGY_GROUPS.flatMap((group) => [...group.options]);
    expect(general).toContain('React');
    expect(general).toContain('MongoDB');
    expect(general).toContain('Scrum');
  });

  it('shows icons in the project picker and selected chips and supports search and removal', async () => {
    const fixture = TestBed.createComponent(ExperienceEntry);
    const form = createExperienceForm();
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('index', 0);
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelectorAll('.option img').length).toBe(23);
    await Promise.all(Array.from(page.querySelectorAll<HTMLImageElement>('.option img'), (image) => image.decode()));
    expect(page.querySelectorAll('.option').length).toBe(23);
    page.querySelector('summary')!.click();
    const search = page.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'stripe';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(page.querySelectorAll('.option').length).toBe(1);
    page.querySelector<HTMLInputElement>('.option input')!.click();
    await fixture.whenStable();
    expect(form.controls.technologies.value).toEqual(['Stripe']);
    expect(page.querySelector('.chips img')!.getAttribute('src')).toBe('used-tech-icons/ic-stripe.svg');
    page.querySelector<HTMLButtonElement>('[aria-label="Remove Stripe"]')!.click();
    await fixture.whenStable();
    expect(form.controls.technologies.value).toEqual([]);
    expect(page.querySelector('.chips img')).toBeNull();
  });

  it('keeps older unsupported selections visible and removable without offering them as new options', async () => {
    const fixture = TestBed.createComponent(ExperienceEntry);
    const form = createExperienceForm();
    form.controls.technologies.setValue(['React']);
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('index', 0);
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('.chips')!.textContent).toContain('React');
    expect(page.querySelector('.chips img')).toBeNull();
    expect(Array.from(page.querySelectorAll('.option span'), (item) => item.textContent)).not.toContain('React');
    page.querySelector<HTMLButtonElement>('[aria-label="Remove React"]')!.click();
    expect(form.controls.technologies.value).toEqual([]);
  });

  it('renders only labeled icons in CV blocks and preserves all technology names in text view', async () => {
    const draft = TestBed.inject(CvDraft);
    draft.save({
      name: 'Alex', positionTitle: 'Developer', description: 'Applications', photo: null,
      languages: [], technologies: ['React'], experiences: [{
        company: 'Project', position: '', startDate: '', endDate: '', isCurrent: false,
        description: '', technologies: ['Angular', 'SignalR', 'React']
      }]
    });
    const fixture = TestBed.createComponent(Preview);
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(Array.from(page.querySelectorAll('.experience-technologies img'), (image) => image.getAttribute('src')))
      .toEqual(['used-tech-icons/angular-icon.svg', 'used-tech-icons/ic-signalR.svg']);
    expect(page.querySelector('.experience-technologies')!.textContent!.trim()).toBe('');
    expect(page.querySelectorAll('.experience-technologies li').length).toBe(2);
    expect(Array.from(page.querySelectorAll('.experience-technologies img'), (image) => image.getAttribute('alt')))
      .toEqual(['Angular', 'SignalR']);
    expect(Array.from(page.querySelectorAll('.experience-technologies li'), (item) => item.getAttribute('title')))
      .toEqual(['Angular', 'SignalR']);
    expect(page.querySelector('.cv-technologies')!.textContent).toContain('React');
    expect(page.querySelector('.cv-technologies img')).toBeNull();
    draft.updateStructure({ sidebarPosition: 'right', technologiesView: 'comma-separated' });
    await fixture.whenStable();
    expect(page.querySelector('.technologies-inline')!.textContent!.trim()).toBe('Angular, SignalR, React');
    expect(page.querySelector('.experience-technologies')).toBeNull();
  });
});
