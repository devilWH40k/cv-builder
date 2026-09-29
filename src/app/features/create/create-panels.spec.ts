import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Create } from './create';

describe('CV expandable sections', () => {
  it('starts expanded, toggles independently, and preserves entries and validation while collapsed', async () => {
    TestBed.configureTestingModule({
      imports: [Create],
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    });
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    const experienceToggle = page.querySelector<HTMLButtonElement>('#experience-panel-heading')!;
    const languageToggle = page.querySelector<HTMLButtonElement>('#languages-panel-heading')!;
    const experiencePanel = page.querySelector<HTMLElement>('#experience-panel')!;
    const languagePanel = page.querySelector<HTMLElement>('#languages-panel')!;
    expect(experienceToggle.getAttribute('aria-expanded')).toBe('true');
    expect(languageToggle.getAttribute('aria-expanded')).toBe('true');
    expect(experiencePanel.hidden).toBeFalse();
    expect(languagePanel.hidden).toBeFalse();
    expect(experiencePanel.textContent).toContain('Add an experience to boost your CV');
    const expandedIcon = experienceToggle.querySelector('svg')!.innerHTML;

    page.querySelector<HTMLButtonElement>('[aria-label="Add experience"] button')!.click();
    page.querySelector<HTMLButtonElement>('[aria-label="Add language"] button')!.click();
    await fixture.whenStable();
    const form = fixture.componentInstance.form;
    form.patchValue({ name: 'Alex', positionTitle: 'Developer', description: 'Summary' });
    form.controls.experiences.at(0).controls.company.setValue('Example');
    await fixture.whenStable();
    const editor = page.querySelector('[contenteditable="true"]');
    expect(editor).not.toBeNull();
    expect(experiencePanel.querySelector('.empty-state')).toBeNull();
    expect(form.invalid).toBeTrue();

    experienceToggle.click();
    await fixture.whenStable();
    expect(experiencePanel.hidden).toBeTrue();
    expect(languagePanel.hidden).toBeFalse();
    expect(experienceToggle.getAttribute('aria-expanded')).toBe('false');
    expect(experienceToggle.querySelector('svg')!.innerHTML).not.toBe(expandedIcon);
    languageToggle.click();
    await fixture.whenStable();
    expect(languagePanel.hidden).toBeTrue();
    expect(page.querySelector<HTMLButtonElement>('.actions > app-button button')!.disabled).toBeFalse();

    experienceToggle.click();
    languageToggle.click();
    await fixture.whenStable();
    expect(page.querySelector('[contenteditable="true"]')).toBe(editor);
    expect(page.querySelector<HTMLInputElement>('#company-0')!.value).toBe('Example');
    expect(form.controls.languages.length).toBe(1);
    page.querySelector<HTMLButtonElement>('[aria-label="Remove language 1"]')!.click();
    page.querySelector<HTMLButtonElement>('[aria-label="Remove experience 1"]')!.click();
    await fixture.whenStable();
    expect(experiencePanel.textContent).toContain('Add an experience to boost your CV');
    expect(form.valid).toBeTrue();
  });
});
