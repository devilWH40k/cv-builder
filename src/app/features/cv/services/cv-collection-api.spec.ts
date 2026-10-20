import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CvCollectionApi } from './cv-collection-api';
import { completed, CV_DATABASE_NAME, CvDatabase } from './cv-database';
import { SavedCv, SavedCvs } from './saved-cvs';
import { CvFolder } from '../interfaces/cv-folder';

describe('IndexedDB collection pages', () => {
  let databaseName: string;
  const records: SavedCv[] = Array.from({ length: 80 }, (_, index) => ({
    id: `cv-${String(index).padStart(3, '0')}`, updatedAt: 1000 - index,
    info: { name: 'Performance CV', positionTitle: 'Developer', description: 'Large description '.repeat(200),
      photo: null, technologies: [], experiences: [], languages: [] }
  }));
  const folders: CvFolder[] = Array.from({ length: 10 }, (_, index) => ({
    id: `folder-${index}`, name: `Folder ${String(index).padStart(2, '0')}`,
    cvIds: records.slice(index * 4, index * 4 + 4).map((cv) => cv.id)
  }));

  beforeEach(() => {
    databaseName = `cv-collection-api-${crypto.randomUUID()}`;
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
    await saved.importRecords(records, [], true, [], folders);
    return { saved, api: TestBed.inject(CvCollectionApi) };
  }

  it('fetches only the 24 requested entities, using cursor offsets instead of reading skipped CVs', async () => {
    const { api } = await seed();
    const get = spyOn(IDBObjectStore.prototype, 'get').and.callThrough();
    const getAll = spyOn(IDBObjectStore.prototype, 'getAll').and.callThrough();
    const advance = spyOn(IDBCursor.prototype, 'advance').and.callThrough();
    const entityReads = () => get.calls.all().filter((call) => call.object instanceof IDBObjectStore &&
      ['cvs', 'folders'].includes(call.object.name));
    const first = await api.getPage(0, 24);
    expect(first.folders.map((folder) => folder.id)).toEqual(folders.map((folder) => folder.id));
    expect(first.cvs.map((cv) => cv.id)).toEqual(records.slice(40, 54).map((cv) => cv.id));
    expect(first.total).toBe(50);
    expect(first.hasMore).toBeTrue();
    expect(first.nextOffset).toBe(24);
    expect(entityReads().length).toBe(24);
    get.calls.reset();
    const second = await api.getPage(24, 24);
    expect(second.folders).toEqual([]);
    expect(second.cvs.map((cv) => cv.id)).toEqual(records.slice(54, 78).map((cv) => cv.id));
    expect(entityReads().length).toBe(24);
    expect(advance).toHaveBeenCalledWith(24);
    get.calls.reset();
    const last = await api.getPage(48, 24);
    expect(last.cvs.map((cv) => cv.id)).toEqual(records.slice(78).map((cv) => cv.id));
    expect(last.hasMore).toBeFalse();
    expect(entityReads().length).toBe(2);
    expect(advance).toHaveBeenCalledWith(48);
    expect(getAll).not.toHaveBeenCalled();
  });

  it('builds the initial lightweight index without reading all CV bodies', async () => {
    const database = await TestBed.inject(CvDatabase).open();
    const transaction = database.transaction(['cvs', 'folders'], 'readwrite');
    for (const cv of records) transaction.objectStore('cvs').put(cv);
    for (const folder of folders) transaction.objectStore('folders').put(folder);
    await completed(transaction);
    const getAll = spyOn(IDBObjectStore.prototype, 'getAll').and.callThrough();
    const api = TestBed.inject(CvCollectionApi);
    const rebuild = spyOn(api, 'refreshIndex').and.callThrough();
    const first = await api.getPage();
    await api.getPage(24);
    expect(first.cvs.length + first.folders.length).toBe(24);
    expect(rebuild).toHaveBeenCalledTimes(1);
    expect(getAll.calls.all().some((call) => call.object instanceof IDBObjectStore && call.object.name === 'cvs')).toBeFalse();
  });

  it('reads only the opened folder and preserves saved manual order after moves and reordering', async () => {
    const { api, saved } = await seed();
    saved.usePagedCache();
    const getAll = spyOn(IDBObjectStore.prototype, 'getAll').and.callThrough();
    expect((await api.getPage(0, 24, 'folder-0')).cvs.map((cv) => cv.id))
      .toEqual(records.slice(0, 4).map((cv) => cv.id));
    await saved.reorderCv({ cvId: records[43].id, targetId: records[40].id, position: 'before' });
    expect((await api.getPage()).cvs[0].id).toBe(records[43].id);
    await saved.moveCv(records[43].id, 'folder-0');
    expect(await api.getLocation(records[43].id)).toBe('folder-0');
    expect((await api.getPage()).cvs.some((cv) => cv.id === records[43].id)).toBeFalse();
    expect((await api.getPage(0, 24, 'folder-0')).cvs.some((cv) => cv.id === records[43].id)).toBeTrue();
    await saved.delete(records[43].id);
    expect(await api.getLocation(records[43].id)).toBeUndefined();
    expect(getAll.calls.all().some((call) => call.object instanceof IDBObjectStore && call.object.name === 'cvs')).toBeFalse();
  });

  it('handles out-of-range and invalid pages without bulk reads', async () => {
    const { api } = await seed();
    const page = await api.getPage(200, 24);
    expect(page.cvs).toEqual([]);
    expect(page.folders).toEqual([]);
    expect(page.hasMore).toBeFalse();
    await expectAsync(api.getPage(-1)).toBeRejected();
    await expectAsync(api.getPage(0, 0)).toBeRejected();
    await expectAsync(api.getPage(0, 1001)).toBeRejected();
    await expectAsync(api.getPage(0.5)).toBeRejected();
  });
});
