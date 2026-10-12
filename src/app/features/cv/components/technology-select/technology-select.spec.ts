import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { TechnologySelect } from './technology-select';
import { MultiSelect } from '../../../../shared/ui/multi-select/multi-select';
import { CustomEntryIcons } from '../../../../core/dialogs/custom-entry-dialog/custom-entry-icon';
import { CV_DATABASE_NAME, SavedCvs } from '../../services/saved-cvs';

@Component({
  imports: [TechnologySelect, MultiSelect],
  template: `
    <app-technology-select inputId="general" label="General" [groups]="groups" [control]="general" [customIcons]="generalIcons" />
    <app-technology-select inputId="used" label="Used" [groups]="groups" [control]="used" [customIcons]="usedIcons" />
    <app-multi-select inputId="other" label="Other" [groups]="groups" [control]="other" [allowCustom]="true" />
  `
})
class Host {
  readonly groups = [{ label: 'Default', options: ['TypeScript'] }];
  readonly general = new FormControl<readonly string[]>([], { nonNullable: true });
  readonly used = new FormControl<readonly string[]>([], { nonNullable: true });
  readonly other = new FormControl<readonly string[]>([], { nonNullable: true });
  readonly generalIcons = new FormControl<CustomEntryIcons>({}, { nonNullable: true });
  readonly usedIcons = new FormControl<CustomEntryIcons>({}, { nonNullable: true });
}

describe('Technology library selectors', () => {
  let databaseName: string;
  beforeEach(() => {
    databaseName = 'cv-technology-test-' + crypto.randomUUID();
    TestBed.configureTestingModule({ imports: [Host], providers: [provideZonelessChangeDetection(),
      { provide: CV_DATABASE_NAME, useValue: databaseName }] });
  });
  afterEach(async () => {
    TestBed.resetTestingModule();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });

  async function open() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    page.querySelector<HTMLButtonElement>('app-technology-select .add-custom')!.click();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('dialog')!;
    const name = dialog.querySelector<HTMLInputElement>('input[type="text"]')!;
    name.value = 'My SDK';
    name.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    return { fixture, page, dialog };
  }

  it('saves and applies once, updates both technology pickers, and leaves generic multi-selects independent', async () => {
    const { fixture, page, dialog } = await open();
    dialog.querySelector<HTMLButtonElement>('.apply-save button')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.general.value).toEqual(['My SDK']);
    const selectors = Array.from(page.querySelectorAll('app-technology-select'));
    for (const selector of selectors) expect(selector.textContent).toContain('My SDK');
    expect(page.querySelector('app-multi-select #other')!.closest('app-multi-select')!.textContent).not.toContain('My SDK');
    const record = TestBed.inject(SavedCvs).technologies()[0];
    expect(record.name).toBe('My SDK');
    fixture.destroy();
    const reopened = TestBed.createComponent(Host);
    reopened.detectChanges();
    await reopened.whenStable();
    expect(reopened.nativeElement.querySelector('app-technology-select').textContent).toContain('My SDK');
    expect(reopened.componentInstance.general.value).toEqual([]);
  });

  it('Apply selects a local entry without saving it to the shared library', async () => {
    const { fixture, page, dialog } = await open();
    dialog.querySelector<HTMLButtonElement>('app-button button')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.general.value).toEqual(['My SDK']);
    expect(TestBed.inject(SavedCvs).technologies()).toEqual([]);
    expect(page.querySelectorAll('app-technology-select')[1].textContent).not.toContain('My SDK');
  });

  it('keeps the dialog and selections intact after a save failure and allows retry', async () => {
    const { fixture, dialog } = await open();
    const saved = TestBed.inject(SavedCvs);
    const save = spyOn(saved, 'saveTechnology').and.rejectWith(new Error('Storage unavailable'));
    const button = dialog.querySelector<HTMLButtonElement>('.apply-save button')!;
    button.click();
    await fixture.whenStable();
    expect(dialog.open).toBeTrue();
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('could not be saved');
    expect(fixture.componentInstance.general.value).toEqual([]);
    expect(button.disabled).toBeFalse();
    save.and.callThrough();
    button.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.general.value).toEqual(['My SDK']);
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('copies a saved icon into the selected CV snapshot', async () => {
    const saved = TestBed.inject(SavedCvs);
    const icon = document.createElement('canvas').toDataURL('image/png');
    await saved.saveTechnology({ name: 'SDK', icon });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    const used = page.querySelectorAll('app-technology-select')[1];
    used.querySelector<HTMLInputElement>('.options fieldset:last-child input')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.used.value).toEqual(['SDK']);
    expect(fixture.componentInstance.usedIcons.value).toEqual({ SDK: icon });
    await saved.saveTechnology({ name: 'SDK' });
    expect(fixture.componentInstance.usedIcons.value).toEqual({ SDK: icon });
  });
});
