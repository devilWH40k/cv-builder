import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ExperiencesDialog } from './experiences-dialog';
import { SavedCvs } from '../../../cv/services/saved-cvs';
import { SavedExperience } from '../../../cv/interfaces/experience';
import { Toasts } from '../../../../shared/ui/toast/toast';

@Component({ imports: [Toasts], template: '<app-toasts />' })
class ToastHost {}

const record: SavedExperience = {
  id: 'saved-1', updatedAt: 1, experience: {
    company: 'Example', position: 'Developer', startDate: '2020', endDate: '',
    isCurrent: true, technologies: [], description: ''
  }
};

describe('Experiences dialog', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  async function setup(records: SavedExperience[] = [record], linkedIds: string[] = []) {
    spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.resolveTo(records);
    const fixture = TestBed.createComponent(ExperiencesDialog);
    fixture.componentRef.setInput('linkedIds', linkedIds);
    const applied = jasmine.createSpy('applied');
    fixture.componentInstance.applied.subscribe(applied);
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('.dialog-overlay dialog')!;
    return { fixture, dialog, applied };
  }

  it('centers in the body, applies selected records, and cleans up the overlay', async () => {
    const { fixture, dialog, applied } = await setup();
    const bounds = dialog.getBoundingClientRect();
    expect(bounds.left + bounds.width / 2).toBeCloseTo(window.innerWidth / 2, 0);
    expect(bounds.top + bounds.height / 2).toBeCloseTo(window.innerHeight / 2, 0);
    const apply = dialog.querySelector<HTMLButtonElement>('app-button button')!;
    expect(apply.disabled).toBeTrue();
    dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await fixture.whenStable();
    apply.click();
    expect(applied).toHaveBeenCalledWith([record]);
    expect(document.querySelector('.dialog-overlay')).toBeNull();
  });

  it('traps keyboard focus and dismisses on backdrop click', async () => {
    const { fixture, dialog, applied } = await setup();
    const cancel = dialog.querySelector<HTMLButtonElement>('.cancel')!;
    const search = dialog.querySelector<HTMLInputElement>('#experience-search')!;
    cancel.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
    expect(document.activeElement).toBe(search);
    const cancelled = jasmine.createSpy('cancelled');
    fixture.componentInstance.cancelled.subscribe(cancelled);
    dialog.parentElement!.click();
    expect(cancelled).toHaveBeenCalled();
    expect(applied).not.toHaveBeenCalled();
    expect(document.querySelector('.dialog-overlay')).toBeNull();
  });

  it('paginates six records at a time and preserves selections across pages and searches', async () => {
    const records = Array.from({ length: 8 }, (_, index) => ({
      ...record, id: `saved-${index}`, experience: {
        ...record.experience, company: `Company ${index}`, position: index === 7 ? 'Designer' : 'Developer'
      }
    }));
    const { fixture, dialog, applied } = await setup(records);
    const cards = () => dialog.querySelectorAll('.experience');
    const navigation = () => dialog.querySelectorAll<HTMLButtonElement>('.pagination button');
    expect(cards().length).toBe(6);
    expect(navigation()[0].disabled).toBeTrue();
    dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    navigation()[1].click();
    await fixture.whenStable();
    expect(cards().length).toBe(2);
    expect(navigation()[1].disabled).toBeTrue();
    dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    const search = dialog.querySelector<HTMLInputElement>('#experience-search')!;
    search.value = '  DESIGNER  ';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(cards().length).toBe(1);
    expect(cards()[0].textContent).toContain('Company 7');
    expect(dialog.querySelector('.pagination')).toBeNull();
    search.value = 'Company 0';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBeTrue();
    search.value = 'missing';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(dialog.textContent).toContain('No experiences match your search.');
    search.value = '';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(cards().length).toBe(6);
    expect(dialog.textContent).toContain('Page 1 of 2');
    expect(dialog.textContent).not.toContain('You have no selected experiences.');
    dialog.querySelector<HTMLButtonElement>('footer app-button button')!.click();
    expect(applied).toHaveBeenCalledWith([records[0], records[6]]);
  });

  it('disables entries already linked to the CV', async () => {
    const { dialog } = await setup([record], [record.id]);
    expect(dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')!.disabled).toBeTrue();
    expect(dialog.textContent).toContain('Already added');
  });

  it('shows an empty state and cancels on Escape without applying', async () => {
    const { fixture, dialog, applied } = await setup([]);
    const cancelled = jasmine.createSpy('cancelled');
    fixture.componentInstance.cancelled.subscribe(cancelled);
    expect(dialog.textContent).toContain('You have no saved experiences');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelled).toHaveBeenCalled();
    expect(applied).not.toHaveBeenCalled();
  });

  it('keeps failure toasts above the dialog and supports retry', async () => {
    const list = spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.rejectWith(new Error('Unavailable'));
    const toasts = TestBed.createComponent(ToastHost);
    const fixture = TestBed.createComponent(ExperiencesDialog);
    document.body.append(toasts.nativeElement);
    toasts.detectChanges();
    await fixture.whenStable();
    await toasts.whenStable();
    const toast: HTMLElement = toasts.nativeElement.querySelector('app-toasts');
    expect(toast.querySelector('.toast.danger')?.textContent).toContain('could not be loaded');
    expect(toast.inert).toBeFalse();
    const dialog = document.querySelector<HTMLDialogElement>('.dialog-overlay dialog')!;
    expect(Number(getComputedStyle(toast).zIndex)).toBeGreaterThan(Number(getComputedStyle(dialog.parentElement!).zIndex));
    list.and.resolveTo([record]);
    dialog.querySelector<HTMLButtonElement>('app-button button')!.click();
    await fixture.whenStable();
    expect(dialog.textContent).toContain('Example');
  });
});
