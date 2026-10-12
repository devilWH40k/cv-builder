import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Header } from '../../../../core/components/header/header';
import { SavedCvs } from '../../services/saved-cvs';
import { SavedTechnology } from '../../helpers/saved-technology';

describe('Header technologies dialog', () => {
  let fixture: ComponentFixture<Header>;
  let saved: jasmine.SpyObj<Pick<SavedCvs, 'loadTechnologies' | 'deleteTechnology' | 'saveTechnology'>>;
  const records = signal<readonly SavedTechnology[]>([]);

  beforeEach(async () => {
    records.set([{ id: 'sdk', name: 'SDK', updatedAt: 1 }]);
    saved = jasmine.createSpyObj('SavedCvs', ['loadTechnologies', 'deleteTechnology', 'saveTechnology']);
    saved.saveTechnology.and.callFake(async (entry) => {
      records.update((entries) => [...entries, { ...entry, id: entry.name.toLowerCase(), updatedAt: 2 }]);
      return entry;
    });
    saved.loadTechnologies.and.resolveTo();
    saved.deleteTechnology.and.callFake(async (id) => {
      records.update((entries) => entries.filter((entry) => entry.id !== id));
    });
    TestBed.configureTestingModule({ imports: [Header], providers: [
      provideZonelessChangeDetection(), provideRouter([]),
      { provide: SavedCvs, useValue: { ...saved, technologies: records.asReadonly() } }
    ] });
    fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
  });

  async function open(): Promise<HTMLDialogElement> {
    const host: HTMLElement = fixture.nativeElement;
    host.querySelector<HTMLButtonElement>('[aria-label="Settings"]')!.click();
    await fixture.whenStable();
    host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[1].click();
    await fixture.whenStable();
    return document.querySelector<HTMLDialogElement>('dialog[aria-labelledby="technologies-title"]')!;
  }

  it('opens from Settings, lists and deletes saved technologies, and restores focus on close', async () => {
    const dialog = await open();
    expect(dialog.open).toBeTrue();
    expect(dialog.querySelector('h2')!.textContent).toBe('Technologies');
    expect(parseFloat(getComputedStyle(dialog).minHeight)).toBeGreaterThan(0);
    dialog.querySelector<HTMLButtonElement>('[aria-label="Delete SDK"]')!.click();
    await fixture.whenStable();
    expect(saved.deleteTechnology).toHaveBeenCalledOnceWith('sdk');
    expect(dialog.textContent).toContain('No saved technologies yet.');
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await fixture.whenStable();
    expect(dialog.open).toBeFalse();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Settings');
  });

  it('retains failed deletions and allows retry without duplicate requests', async () => {
    let rejectDelete!: (error: Error) => void;
    saved.deleteTechnology.and.returnValue(new Promise<void>((_, reject) => { rejectDelete = reject; }));
    const dialog = await open();
    const button = dialog.querySelector<HTMLButtonElement>('[aria-label="Delete SDK"]')!;
    button.click();
    await fixture.whenStable();
    expect(button.disabled).toBeTrue();
    button.click();
    expect(saved.deleteTechnology).toHaveBeenCalledTimes(1);
    rejectDelete(new Error('Storage unavailable'));
    await Promise.resolve();
    await fixture.whenStable();
    expect(dialog.querySelector('[role="alert"]')!.textContent).toContain('could not be deleted');
    expect(button.disabled).toBeFalse();
    expect(records().length).toBe(1);
  });

  it('adds through the custom-entry dialog and returns to the updated library', async () => {
    const library = await open();
    library.querySelector<HTMLButtonElement>('footer button')!.click();
    await fixture.whenStable();
    const custom = document.querySelector<HTMLDialogElement>('dialog[aria-labelledby="saved-technology-custom-title"]')!;
    expect(custom.open).toBeTrue();
    expect(library.open).toBeFalse();
    expect(custom.querySelector('app-file-upload')).not.toBeNull();
    const input = custom.querySelector<HTMLInputElement>('#saved-technology-custom-name')!;
    input.value = 'New tool';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    custom.querySelector<HTMLButtonElement>('app-button button')!.click();
    await fixture.whenStable();
    expect(saved.saveTechnology).toHaveBeenCalledOnceWith({ name: 'New tool' });
    expect(library.open).toBeTrue();
    expect(library.querySelector('[aria-label="Delete New tool"]')).not.toBeNull();
    expect(document.activeElement).toBe(library.querySelector('footer button'));
  });

  it('keeps the entry on save failure and returns to the library on cancel', async () => {
    saved.saveTechnology.and.rejectWith(new Error('Storage unavailable'));
    const library = await open();
    library.querySelector<HTMLButtonElement>('footer button')!.click();
    await fixture.whenStable();
    const custom = document.querySelector<HTMLDialogElement>('dialog[aria-labelledby="saved-technology-custom-title"]')!;
    const input = custom.querySelector<HTMLInputElement>('#saved-technology-custom-name')!;
    input.value = 'New tool';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(custom.open).toBeTrue();
    expect(custom.textContent).toContain('could not be saved');
    expect(input.value).toBe('New tool');
    custom.querySelector<HTMLButtonElement>('.cancel')!.click();
    await fixture.whenStable();
    expect(library.open).toBeTrue();
    expect(records().length).toBe(1);
    library.querySelector<HTMLButtonElement>('[aria-label="Close technologies"]')!.click();
    await fixture.whenStable();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Settings');
  });

  it('shows loading, reports load errors, and allows retry', async () => {
    let rejectLoad!: (error: Error) => void;
    saved.loadTechnologies.and.returnValue(new Promise<void>((_, reject) => { rejectLoad = reject; }));
    const dialog = await open();
    expect(dialog.textContent).toContain('Loading technologies');
    rejectLoad(new Error('Storage unavailable'));
    await Promise.resolve();
    await fixture.whenStable();
    expect(dialog.querySelector('[role="alert"]')!.textContent).toContain('could not be loaded');
    saved.loadTechnologies.and.resolveTo();
    dialog.querySelector<HTMLButtonElement>('.retry')!.click();
    await fixture.whenStable();
    expect(dialog.querySelector('[aria-label="Delete SDK"]')).not.toBeNull();
  });
});
