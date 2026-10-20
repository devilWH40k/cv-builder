import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { completed, CV_DATABASE_NAME, CvDatabase } from '../../cv/services/cv-database';
import { SavedCvs } from '../../cv/services/saved-cvs';
import { SavedExperience } from '../../cv/interfaces/experience';
import { ExperiencesApi } from './experiences-api';

describe('IndexedDB experience pages', () => {
  let databaseName: string;
  const records: SavedExperience[] = Array.from({ length: 100 }, (_, index) => ({
    id: `experience-${String(index).padStart(3, '0')}`, updatedAt: 1000 - index,
    experience: { company: index % 2 ? 'Other project' : 'Target project', position: 'Engineer',
      description: '<p>CRM system</p>', technologies: ['Angular', 'TypeScript'], isUpdated: false,
      startDate: '', endDate: '', isCurrent: false }
  }));
  beforeEach(() => {
    databaseName = `experience-api-${crypto.randomUUID()}`;
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
      { provide: CV_DATABASE_NAME, useValue: databaseName }] });
    spyOn(Storage.prototype, 'getItem').and.returnValue(null);
  });
  afterEach(async () => {
    TestBed.resetTestingModule();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Database still open.'));
    });
  });
  async function seed() {
    const saved = TestBed.inject(SavedCvs);
    await saved.importRecords([], records, true);
    return { saved, api: TestBed.inject(ExperiencesApi) };
  }

  it('reads 24 experience records per offset request without bulk-reading the library', async () => {
    const { api } = await seed();
    const get = spyOn(IDBObjectStore.prototype, 'get').and.callThrough();
    const getAll = spyOn(IDBObjectStore.prototype, 'getAll').and.callThrough();
    const advance = spyOn(IDBCursor.prototype, 'advance').and.callThrough();
    const first = await api.getPage();
    expect(first.records.map((record) => record.id)).toEqual(records.slice(0, 24).map((record) => record.id));
    expect(first.hasMore).toBeTrue();
    get.calls.reset();
    const next = await api.getPage(24);
    expect(next.records.map((record) => record.id)).toEqual(records.slice(24, 48).map((record) => record.id));
    expect(get.calls.all().filter((call) => call.object instanceof IDBObjectStore && call.object.name === 'experiences').length).toBe(24);
    expect(advance).toHaveBeenCalledWith(24);
    expect(getAll).not.toHaveBeenCalled();
  });

  it('applies the offset to matching results and hydrates only that page, including matches beyond the initial batch', async () => {
    const { api } = await seed();
    const get = spyOn(IDBObjectStore.prototype, 'get').and.callThrough();
    const getAll = spyOn(IDBObjectStore.prototype, 'getAll').and.callThrough();
    const search = { query: '  TARGET  ', columns: ['company'] };
    const matches = records.filter((_, index) => index % 2 === 0);
    const first = await api.getPage(0, 24, search);
    expect(first.records.map((record) => record.id)).toEqual(matches.slice(0, 24).map((record) => record.id));
    expect(first.records.at(-1)?.id).toBe(records[46].id);
    expect(get.calls.all().filter((call) => call.object instanceof IDBObjectStore && call.object.name === 'experiences').length).toBe(24);
    const next = await api.getPage(24, 24, search);
    const last = await api.getPage(48, 24, search);
    expect(next.records.map((record) => record.id)).toEqual(matches.slice(24, 48).map((record) => record.id));
    expect(last.records.length).toBe(2);
    expect(last.hasMore).toBeFalse();
    expect(getAll).not.toHaveBeenCalled();
  });

  it('honors the selected search columns and supports text, technologies, booleans, and no matches', async () => {
    const { api } = await seed();
    expect((await api.getPage(0, 24, { query: 'target', columns: ['position'] })).records).toEqual([]);
    for (const [query, column] of [['crm', 'description'], ['typescript', 'technologies'], ['false', 'isUpdated']]) {
      expect((await api.getPage(0, 24, { query, columns: [column] })).records.length).toBe(24);
    }
    const page = await api.getPage(0, 24, { query: 'not found', columns: ['company', 'position'] });
    expect(page.records).toEqual([]);
    expect(page.hasMore).toBeFalse();
  });

  it('keeps the search index correct after library edits, deletion, imports, and replacement imports', async () => {
    const { api, saved } = await seed();
    await saved.saveExperience({ ...records[0].experience, savedExperienceId: records[0].id, company: 'Renamed project' });
    const query = { query: 'renamed', columns: ['company'] };
    expect((await api.getPage(0, 24, query)).records[0].id).toBe(records[0].id);
    await saved.deleteExperience(records[0].id);
    expect((await api.getPage(0, 24, query)).records).toEqual([]);
    await saved.importExperiences([{ ...records[0].experience, company: 'Renamed project' }]);
    expect((await api.getPage(0, 24, query)).records.length).toBe(1);
    await saved.importRecords([], [], true);
    expect((await api.getPage()).records).toEqual([]);
  });

  it('backfills existing library records once and accepts cancellation before reading a page', async () => {
    const database = await TestBed.inject(CvDatabase).open();
    const transaction = database.transaction('experiences', 'readwrite');
    for (const record of records) transaction.objectStore('experiences').put(record);
    await completed(transaction);
    const cursor = spyOn(IDBObjectStore.prototype, 'openCursor').and.callThrough();
    const api = TestBed.inject(ExperiencesApi);
    await api.getPage();
    await api.getPage(24);
    expect(cursor.calls.all().filter((call) => call.object instanceof IDBObjectStore && call.object.name === 'experiences').length).toBe(1);
    const controller = new AbortController();
    controller.abort();
    await expectAsync(api.getPage(0, 24, { query: '', columns: [] }, controller.signal)).toBeRejected();
  });
});
