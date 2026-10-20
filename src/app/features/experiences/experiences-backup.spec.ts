import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Header } from '../../core/components/header/header';
import { createArchive } from '../cv/helpers/cv-archive';
import { SavedExperience } from '../cv/interfaces/experience';
import { CvBackup } from '../cv/services/cv-backup';
import { CV_DATABASE_NAME, SavedCvs } from '../cv/services/saved-cvs';
import { Experiences } from './experiences';
import { ExperiencePage, ExperiencesApi } from './services/experiences-api';

const experience = { company: 'Original project', position: 'Engineer', startDate: '', endDate: '',
  isCurrent: false, technologies: [], description: '<p>Project</p>' };
const imported: SavedExperience = { id: 'backup-project', updatedAt: 2,
  experience: { ...experience, company: 'Project from backup' } };

describe('ZIP imports on the open Experiences page', () => {
  let databaseName: string;
  let header: ComponentFixture<Header>;
  let page: ComponentFixture<Experiences>;
  let saved: SavedCvs;
  let list: jasmine.Spy<ExperiencesApi['getPage']>;
  let importZip: jasmine.Spy<CvBackup['import']>;

  beforeEach(async () => {
    databaseName = 'experience-backup-test-' + crypto.randomUUID();
    spyOn(Storage.prototype, 'getItem').and.returnValue(null);
    TestBed.configureTestingModule({
      imports: [Header, Experiences],
      providers: [provideZonelessChangeDetection(), provideRouter([]),
        { provide: CV_DATABASE_NAME, useValue: databaseName }]
    });
    saved = TestBed.inject(SavedCvs);
    await saved.saveExperience(experience);
    list = spyOn(TestBed.inject(ExperiencesApi), 'getPage').and.callThrough();
    importZip = spyOn(TestBed.inject(CvBackup), 'import').and.callThrough();
    header = TestBed.createComponent(Header);
    page = TestBed.createComponent(Experiences);
    await settlePage();
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Test database is still open.'));
    });
  });

  async function settlePage(): Promise<void> {
    await page.whenStable();
    await list.calls.mostRecent().returnValue;
    await page.whenStable();
  }

  async function importFromHeader(records: readonly SavedExperience[], wipe = false): Promise<void> {
    const close = document.querySelector<HTMLButtonElement>('dialog[open] [aria-label="Close Import / Export"]');
    if (close) {
      const closed = new Promise<void>((resolve) => close.closest('dialog')!.addEventListener('close', () => resolve(), { once: true }));
      close.click();
      await closed;
    }
    await header.whenStable();
    const button = header.nativeElement.querySelector('[aria-label="Import / Export"]') as HTMLButtonElement;
    button.focus();
    button.click();
    await header.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('dialog[aria-labelledby="backup-title"]')!;
    const input = dialog.querySelector<HTMLInputElement>('#backup-file')!;
    const files = new DataTransfer();
    files.items.add(new File([await createArchive([], records)], 'experiences.zip', { type: 'application/zip' }));
    input.files = files.files;
    input.dispatchEvent(new Event('change'));
    if (wipe) dialog.querySelector<HTMLInputElement>('#wipe-previous-data')!.click();
    await header.whenStable();
    dialog.querySelector<HTMLButtonElement>('section app-button button')!.click();
    await importZip.calls.mostRecent().returnValue;
    await header.whenStable();
    await settlePage();
  }

  function projects(): string[] {
    return Array.from((page.nativeElement as HTMLElement).querySelectorAll('app-table-row'))
      .map((row) => row.querySelector('app-table-cell')!.textContent!.trim()).sort();
  }

  it('shows merged experiences immediately and updates existing IDs without duplicating rows', async () => {
    const existing = (await saved.listExperiences())[0];
    expect(projects()).toEqual(['Original project']);
    await importFromHeader([imported]);
    expect(projects()).toEqual(['Original project', 'Project from backup']);
    expect(list.calls.count()).toBeGreaterThan(1);
    await importFromHeader([{ ...existing, experience: { ...existing.experience, company: 'Updated project' } }]);
    expect(projects()).toEqual(['Project from backup', 'Updated project']);
    expect((await saved.listExperiences()).length).toBe(2);
  });

  it('removes old rows after a replacement import, including an empty backup', async () => {
    await importFromHeader([imported], true);
    expect(projects()).toEqual(['Project from backup']);
    await importFromHeader([], true);
    expect(projects()).toEqual([]);
    expect(page.nativeElement.textContent).toContain('You have no saved experiences');
  });

  it('keeps the current table unchanged when the ZIP transaction fails', async () => {
    const put = IDBObjectStore.prototype.put;
    spyOn(IDBObjectStore.prototype, 'put').and.callFake(function (
      this: IDBObjectStore, value: unknown, key?: IDBValidKey
    ) {
      if (this.name === 'experiences') throw new Error('Write failed');
      return put.call(this, value, key);
    });
    await expectAsync(importFromHeader([imported], true)).toBeRejected();
    await header.whenStable();
    await settlePage();
    expect(projects()).toEqual(['Original project']);
    expect(list).toHaveBeenCalledTimes(1);
    expect((await saved.listExperiences()).map((entry) => entry.experience.company)).toEqual(['Original project']);
    expect(document.querySelector('dialog[aria-labelledby="backup-title"]')?.textContent).toContain('could not be imported');
  });

  it('does not overwrite imported rows when an earlier page load finishes later', async () => {
    const oldRecords = await saved.listExperiences();
    page.destroy();
    let finishOldLoad!: (page: ExperiencePage) => void;
    let rejectOldLoad!: (error: Error) => void;
    const oldLoad = new Promise<ExperiencePage>((resolve, reject) => { finishOldLoad = resolve; rejectOldLoad = reject; });
    let loads = 0;
    list.and.callFake((offset, limit, search, signal) => {
      if (++loads === 1) {
        signal?.addEventListener('abort', () => rejectOldLoad(new DOMException('Aborted', 'AbortError')), { once: true });
        return oldLoad;
      }
      return ExperiencesApi.prototype.getPage.call(TestBed.inject(ExperiencesApi), offset, limit, search, signal);
    });
    page = TestBed.createComponent(Experiences);
    page.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await TestBed.inject(CvBackup).import(new File([await createArchive([], [imported])], 'experiences.zip', { type: 'application/zip' }));
    await settlePage();
    expect(projects()).toEqual(['Original project', 'Project from backup']);
    finishOldLoad({ records: oldRecords, nextOffset: oldRecords.length, hasMore: false });
    await oldLoad.catch(() => undefined);
    await page.whenStable();
    expect(projects()).toEqual(['Original project', 'Project from backup']);
  });
});
