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
  it('keeps custom technologies with icons in blocks and warns only for missing icons', async () => {
    const icon = document.createElement('canvas').toDataURL('image/png');
    const experience = {
      company: 'Project', position: '', startDate: '', endDate: '', isCurrent: false,
      description: '', technologies: ['Angular', 'My SDK'], customTechnologyIcons: { 'My SDK': icon }
    };
    const form = createExperienceForm(experience);
    const entry = TestBed.createComponent(ExperienceEntry);
    entry.componentRef.setInput('form', form);
    entry.componentRef.setInput('index', 0);
    entry.detectChanges();
    const draft = TestBed.inject(CvDraft);
    draft.save({ name: 'Alex', positionTitle: 'Dev', description: '', photo: null,
      languages: [], technologies: ['My SDK'], customTechnologyIcons: { 'My SDK': icon }, experiences: [experience] });
    const preview = TestBed.createComponent(Preview);
    preview.detectChanges();
    await entry.whenStable();
    const page: HTMLElement = entry.nativeElement;
    const documentPage: HTMLElement = preview.nativeElement;
    expect(page.querySelector('.technology-warning')).toBeNull();
    expect(page.querySelector<HTMLImageElement>('.chips img[src^="data:"]')?.src).toBe(icon);
    expect(documentPage.querySelectorAll('.experience-technologies img').length).toBe(2);
    expect(documentPage.querySelector('.technologies-inline')).toBeNull();
    expect(documentPage.querySelector('.cv-technologies img')).toBeNull();
    form.controls.technologies.setValue(['Angular', 'My SDK', 'No icon']);
    entry.changeDetectorRef.markForCheck();
    draft.save({ ...draft.current()!, experiences: [form.getRawValue()] });
    entry.detectChanges();
    await entry.whenStable();
    expect(page.querySelector('.technology-warning')).not.toBeNull();
    expect(documentPage.querySelector('.experience-technologies')).toBeNull();
    expect(documentPage.querySelector('.technologies-inline')?.textContent?.trim()).toBe('Angular, My SDK, No icon');
  });
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
    expect(page.querySelector('.technology-warning')).toBeNull();
    expect(page.querySelector('.chips img')!.getAttribute('src')).toBe('used-tech-icons/ic-stripe.svg');
    page.querySelector<HTMLButtonElement>('[aria-label="Remove Stripe"]')!.click();
    await fixture.whenStable();
    expect(form.controls.technologies.value).toEqual([]);
    expect(page.querySelector('.chips img')).toBeNull();
  });

  it('keeps saved custom selections visible and removable in the picker and chips', async () => {
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
    expect(Array.from(page.querySelectorAll('.option span'), (item) => item.textContent)).toContain('React');
    page.querySelector<HTMLButtonElement>('[aria-label="Remove React"]')!.click();
    expect(form.controls.technologies.value).toEqual([]);
  });

  it('renders only labeled icons in CV blocks and preserves all technology names in text view', async () => {
    const draft = TestBed.inject(CvDraft);
    draft.save({
      name: 'Alex', positionTitle: 'Developer', description: 'Applications', photo: null,
      languages: [], technologies: ['React'], experiences: [{
        company: 'Project', position: '', startDate: '', endDate: '', isCurrent: false,
        description: '', technologies: ['Angular', 'SignalR']
      }, {
        company: 'Custom project', position: '', startDate: '', endDate: '', isCurrent: false,
        description: '', technologies: ['Angular', 'Custom SDK']
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
    expect(page.querySelector('.technologies-inline')!.textContent!.trim()).toBe('Angular, Custom SDK');
    draft.updateStructure({ sidebarPosition: 'right', technologiesView: 'comma-separated' });
    await fixture.whenStable();
    expect(page.querySelector('.technologies-inline')!.textContent!.trim()).toBe('Angular, SignalR');
    expect(page.querySelector('.experience-technologies')).toBeNull();
  });

  it('adds a trimmed custom experience technology without an icon using Enter', async () => {
    const fixture = TestBed.createComponent(ExperienceEntry);
    const form = createExperienceForm();
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('index', 0);
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    page.querySelector<HTMLButtonElement>('.add-custom')!.click();
    await fixture.whenStable();
    const input = document.querySelector<HTMLInputElement>('#experience-technologies-0-custom-name')!;
    input.value = '  Custom SDK  ';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(enter);
    await fixture.whenStable();
    expect(enter.defaultPrevented).toBeTrue();
    expect(form.controls.technologies.value).toEqual(['Custom SDK']);
    expect(form.controls.technologies.dirty).toBeTrue();
    expect(page.querySelector('.chips')!.textContent).toContain('Custom SDK');
    expect(page.querySelector('.chips img')).toBeNull();
    expect(document.querySelector('dialog')).toBeNull();
    const warning = page.querySelector<HTMLButtonElement>('.chips li:last-child.technology-warning button')!;
    const hint = document.getElementById(warning.getAttribute('aria-describedby')!)!;
    expect(hint.textContent).toBe('By adding at least one technology without an icon, experience tech view mode becomes "comma separated"');
    expect(warning.getAttribute('aria-describedby')).toBe(hint.id);
    expect(hint.hidden).toBeTrue();
    warning.focus();
    await fixture.whenStable();
    expect(hint.hidden).toBeFalse();
    warning.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(hint.hidden).toBeTrue();
    page.querySelector<HTMLButtonElement>('[aria-label="Remove Custom SDK"]')!.click();
    await fixture.whenStable();
    expect(page.querySelector('.technology-warning')).toBeNull();
    expect(hint.isConnected).toBeFalse();
  });
});
