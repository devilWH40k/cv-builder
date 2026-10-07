import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Header } from '../../../../core/components/header/header';
import { CvBackup, defaultBackupName, ImportCounts } from '../../services/cv-backup';

describe('Header backup dialog', () => {
  let fixture: ComponentFixture<Header>;
  let page: HTMLElement;
  let backup: jasmine.SpyObj<CvBackup>;

  beforeEach(async () => {
    backup = jasmine.createSpyObj<CvBackup>('CvBackup', ['import', 'export']);
    backup.import.and.resolveTo({ cvs: 2, experiences: 1, technologies: 3 });
    backup.export.and.resolveTo();
    TestBed.configureTestingModule({
      imports: [Header], providers: [provideZonelessChangeDetection(), provideRouter([]),
        { provide: CvBackup, useValue: backup }]
    });
    fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
    page = fixture.nativeElement;
    await openBackup();
    await fixture.whenStable();
  });

  async function openBackup(): Promise<void> {
    page.querySelector<HTMLButtonElement>('[aria-label="Settings"]')!.click();
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('[role="menuitem"]')!.click();
    await fixture.whenStable();
  }

  function selectFile(): File {
    const file = new File(['archive'], 'backup.zip', { type: 'application/zip' });
    const input = page.querySelector<HTMLInputElement>('#backup-file')!;
    const files = new DataTransfer();
    files.items.add(file);
    input.files = files.files;
    input.dispatchEvent(new Event('change'));
    return file;
  }

  it('opens from the header with both options and a dated filename, and closes', async () => {
    expect(page.querySelector('dialog')!.open).toBeTrue();
    expect(page.querySelector('#import-title')!.textContent).toBe('Import DB');
    expect(page.querySelector('#export-title')!.textContent).toBe('Export DB');
    expect(page.querySelector<HTMLInputElement>('#backup-name')!.value).toBe(defaultBackupName());
    page.querySelector<HTMLButtonElement>('.close')!.click();
    await fixture.whenStable();
    expect(page.querySelector('dialog')!.open).toBeFalse();
  });

  it('exports with the edited filename and reports success', async () => {
    const input = page.querySelector<HTMLInputElement>('#backup-name')!;
    input.value = 'my-backup';
    input.dispatchEvent(new Event('input'));
    page.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(backup.export).toHaveBeenCalledOnceWith('my-backup');
    expect(page.querySelector('dialog app-toasts .toast.success')!.textContent).toContain('download has started');
  });

  it('does not export blank or unsafe filenames', async () => {
    const input = page.querySelector<HTMLInputElement>('#backup-name')!;
    for (const name of [' ', '../backup', '.zip']) {
      input.value = name;
      input.dispatchEvent(new Event('input'));
      page.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await fixture.whenStable();
    }
    expect(backup.export).not.toHaveBeenCalled();
    expect(page.querySelector('#backup-name-error')!.textContent).toContain('Enter a file name');
  });

  it('imports the selected file, refreshes feedback and clears the selection', async () => {
    const file = selectFile();
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('section app-button button')!.click();
    await fixture.whenStable();
    expect(backup.import).toHaveBeenCalledOnceWith(file, false);
    expect(page.querySelector('dialog app-toasts .toast.success')!.textContent).toContain('Imported 2 CVs, 1 saved experience and 3 technologies.');
    expect(page.querySelector<HTMLInputElement>('#backup-file')!.value).toBe('');
    expect(page.querySelector<HTMLButtonElement>('section app-button button')!.disabled).toBeTrue();
  });

  it('prevents duplicate operations and dismissal while importing, then allows retry after errors', async () => {
    let rejectImport!: (reason: Error) => void;
    backup.import.and.returnValue(new Promise<ImportCounts>((_, reject) => { rejectImport = reject; }));
    selectFile();
    await fixture.whenStable();
    const button = page.querySelector<HTMLButtonElement>('section app-button button')!;
    button.click();
    await fixture.whenStable();
    expect(button.disabled).toBeTrue();
    expect(page.querySelector<HTMLInputElement>('#wipe-previous-data')!.disabled).toBeTrue();
    const cancel = new Event('cancel', { cancelable: true });
    page.querySelector('dialog')!.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBeTrue();
    button.click();
    expect(backup.import).toHaveBeenCalledTimes(1);
    rejectImport(new Error('Invalid backup.'));
    await fixture.whenStable();
    expect(page.querySelector('dialog app-toasts .toast.danger .content p')!.textContent).toBe('Invalid backup.');
    expect(button.disabled).toBeFalse();
  });

  it('keeps helper text directly below the input with consistent space before actions', () => {
    const input = page.querySelector<HTMLInputElement>('#backup-name')!;
    const hint = page.querySelector<HTMLElement>('#backup-name-hint')!;
    const error = page.querySelector<HTMLElement>('#backup-name-error')!;
    expect(hint.textContent).toBe('The .zip extension is added automatically.');
    expect(input.getAttribute('aria-describedby')).toContain(hint.id);
    expect(error.hidden).toBeTrue();
    expect(hint.getBoundingClientRect().top - input.getBoundingClientRect().bottom).toBeCloseTo(4, 0);
    const exportButton = page.querySelector<HTMLElement>('form app-button')!;
    expect(exportButton.getBoundingClientRect().top - hint.getBoundingClientRect().bottom).toBeCloseTo(16, 0);
    const importHint = page.querySelector<HTMLElement>('#backup-file-hint')!;
    const importButton = page.querySelector<HTMLElement>('.import-controls app-button')!;
    const checkbox = page.querySelector<HTMLElement>('app-checkbox')!;
    expect(checkbox.getBoundingClientRect().top - importHint.getBoundingClientRect().bottom).toBeCloseTo(16, 0);
    expect(importButton.getBoundingClientRect().top - checkbox.getBoundingClientRect().bottom).toBeCloseTo(16, 0);
  });

  it('defaults wipe to unchecked, imports the selected option and resets on reopening', async () => {
    const checkbox = page.querySelector<HTMLInputElement>('#wipe-previous-data')!;
    expect(checkbox.checked).toBeFalse();
    expect(page.querySelector('app-checkbox .caution-icon')).not.toBeNull();
    expect(page.querySelector('app-checkbox')!.textContent).toContain('all saved CVs, experiences and technologies are cleared');
    checkbox.click();
    const file = selectFile();
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('section app-button button')!.click();
    await fixture.whenStable();
    expect(backup.import).toHaveBeenCalledOnceWith(file, true);
    expect(checkbox.checked).toBeFalse();
    checkbox.click();
    page.querySelector<HTMLButtonElement>('.close')!.click();
    await openBackup();
    await fixture.whenStable();
    expect(checkbox.checked).toBeFalse();
  });

  it('supports dismissing feedback and clears old toasts when reopened', async () => {
    page.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('app-toasts button')!.click();
    await fixture.whenStable();
    expect(page.querySelector('.toast')).toBeNull();
    page.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('.close')!.click();
    await openBackup();
    await fixture.whenStable();
    expect(page.querySelector('.toast')).toBeNull();
  });

});
