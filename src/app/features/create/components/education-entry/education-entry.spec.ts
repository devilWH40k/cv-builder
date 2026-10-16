import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { UniversitiesApi } from '../../data-access/universities-api';
import { createEducationForm } from '../../helpers/cv-form';
import { EducationEntry } from './education-entry';

describe('Education entry university suggestions', () => {
  let fixture: ComponentFixture<EducationEntry>;
  let page: HTMLElement;
  let form: ReturnType<typeof createEducationForm>;
  let search: jasmine.Spy;
  let response: Subject<readonly string[]>;

  beforeEach(async () => {
    response = new Subject<readonly string[]>();
    search = jasmine.createSpy('search').and.returnValue(response);
    TestBed.configureTestingModule({
      imports: [EducationEntry],
      providers: [provideZonelessChangeDetection(), { provide: UniversitiesApi, useValue: { search } }]
    });
    fixture = TestBed.createComponent(EducationEntry);
    form = createEducationForm();
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('index', 0);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

  const waitForSearch = () => new Promise<void>((resolve) => setTimeout(resolve, 350));

  function typeUniversity(name: string): void {
    const input = page.querySelector<HTMLInputElement>('#university-0')!;
    input.value = name;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('debounces searches and keeps suggestions optional', async () => {
    typeUniversity('Ha');
    await waitForSearch();
    expect(search).not.toHaveBeenCalled();
    typeUniversity('Har');
    typeUniversity('Harvard');
    expect(search).not.toHaveBeenCalled();
    await waitForSearch();
    expect(search.calls.allArgs()).toEqual([['Harvard']]);
    response.next(['Harvard University']);
    await fixture.whenStable();
    const input = page.querySelector<HTMLInputElement>('#university-0')!;
    expect(input.getAttribute('role')).toBe('combobox');
    expect(page.querySelector('[role="option"]')?.textContent?.trim()).toBe('Harvard University');
    expect(input.value).toBe('Harvard');
    expect(form.valid).toBeTrue();
  });

  it('keeps manual entry valid after failure and allows the next lookup to recover', async () => {
    typeUniversity('My university');
    await waitForSearch();
    response.error(new Error('Offline'));
    await fixture.whenStable();
    expect(page.textContent).toContain('Suggestions are unavailable. Enter your university manually.');
    expect(form.controls.university.value).toBe('My university');
    expect(page.querySelector<HTMLInputElement>('#university-0')!.disabled).toBeFalse();
    expect(form.valid).toBeTrue();

    response = new Subject<readonly string[]>();
    search.and.returnValue(response);
    typeUniversity('Another university');
    await waitForSearch();
    response.next(['Another University']);
    await fixture.whenStable();
    expect(page.querySelector('[role="option"]')?.textContent?.trim()).toBe('Another University');
  });

  it('cancels obsolete searches immediately and clears suggestions when the query is shortened', async () => {
    typeUniversity('Harvard');
    await waitForSearch();
    const staleResponse = response;
    response = new Subject<readonly string[]>();
    search.and.returnValue(response);
    typeUniversity('Oxford');
    staleResponse.next(['Harvard University']);
    await fixture.whenStable();
    expect(page.querySelector('[role="option"]')).toBeNull();
    await waitForSearch();
    response.next(['University of Oxford']);
    await fixture.whenStable();
    expect(page.querySelector('[role="option"]')?.textContent?.trim()).toBe('University of Oxford');
    typeUniversity('Ox');
    await fixture.whenStable();
    expect(page.querySelector('[role="option"]')).toBeNull();
    expect(form.controls.university.value).toBe('Ox');
  });

  it('filters existing suggestions immediately while fetching new results and saves a selected university', async () => {
    typeUniversity('Oxford');
    await waitForSearch();
    response.next(['University of Oxford', 'Oxford Brookes University', 'Harvard University']);
    await fixture.whenStable();
    const options = () => Array.from(page.querySelectorAll('[role="option"]'))
      .map((option) => option.textContent!.trim());
    expect(options()).toEqual(['University of Oxford', 'Oxford Brookes University']);
    response = new Subject<readonly string[]>();
    search.and.returnValue(response);
    typeUniversity('Oxford Brookes');
    await fixture.whenStable();
    expect(options()).toEqual(['Oxford Brookes University']);
    expect(page.querySelector('[role="listbox"]')?.getAttribute('aria-busy')).toBe('true');
    await waitForSearch();
    expect(search).toHaveBeenCalledWith('Oxford Brookes');
    response.next(['Oxford Brookes University', 'University of Oxford']);
    await fixture.whenStable();
    expect(options()).toEqual(['Oxford Brookes University']);
    page.querySelector<HTMLButtonElement>('[role="option"]')!.click();
    await fixture.whenStable();
    expect(form.controls.university.value).toBe('Oxford Brookes University');
    expect(page.querySelector('[role="listbox"]')).toBeNull();
  });

  it('excludes unrelated API results and explains how to keep a manually entered university', async () => {
    typeUniversity('Independent Academy');
    await waitForSearch();
    response.next(['Harvard University', 'University of Oxford']);
    await fixture.whenStable();
    expect(page.querySelector('[role="option"]')).toBeNull();
    expect(page.querySelector('.panel')?.textContent).toContain('No matching universities. Enter your university manually.');
    expect(form.controls.university.value).toBe('Independent Academy');
    expect(form.valid).toBeTrue();
  });

  it('shows date errors after touching the form and supports year-only dates', async () => {
    form.patchValue({ university: 'University', startDate: '2025', endDate: '2024' });
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    form.markAllAsTouched();
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('End date must be on or after');
    const format = page.querySelector<HTMLSelectElement>('#education-date-format-0')!;
    format.value = 'year';
    format.dispatchEvent(new Event('change'));
    form.controls.endDate.setValue('2026');
    await fixture.whenStable();
    expect(form.valid).toBeTrue();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    page.querySelector<HTMLElement>('#education-start-date-0')!.click();
    await fixture.whenStable();
    const year = Array.from(page.querySelectorAll<HTMLButtonElement>('.cells button'))
      .find((button) => button.textContent?.trim() === '2025')!;
    year.click();
    await fixture.whenStable();
    expect(form.controls.startDate.value).toBe('2025');
  });
});
