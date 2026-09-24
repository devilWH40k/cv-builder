import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CV_DATABASE_NAME, SavedCvs } from './saved-cvs';
import { CvInfo } from './cv-draft';
import { LEGACY_STORAGE_KEY } from './legacy-saved-cvs';

describe('IndexedDB saved CVs', () => {
  let databaseName: string;
  let legacy: Map<string, string>;
  const info: CvInfo = {
    name: 'Ada Lovelace', positionTitle: 'Engineer', description: 'Builds things',
    photo: null, languages: [{ language: 'English', level: 'Native' }],
    technologies: ['Angular'], experiences: [{
      company: 'Example', position: 'Developer', startDate: '2020', endDate: '',
      isCurrent: true, technologies: ['TypeScript'], description: '<p>Projects</p>'
    }]
  };
  const service = () => TestBed.runInInjectionContext(() => new SavedCvs());

  beforeEach(() => {
    databaseName = 'cv-builder-test-' + crypto.randomUUID();
    legacy = new Map();
    spyOn(Storage.prototype, 'getItem').and.callFake((key) => legacy.get(key) ?? null);
    spyOn(Storage.prototype, 'removeItem').and.callFake((key) => { legacy.delete(key); });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: CV_DATABASE_NAME, useValue: databaseName }]
    });
    spyOn(navigator.storage, 'estimate').and.resolveTo({
      usage: 2 * 1024 ** 2, quota: 10 * 1024 ** 3
    });
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

  it('persists snapshots across instances and updates the same record', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    const restored = service();
    expect(await restored.load(id)).toEqual(info);
    await restored.save({ ...info, name: 'Updated' }, id);
    expect(restored.all().length).toBe(1);
    expect((await saved.load(id))?.name).toBe('Updated');
    expect((await saved.load(id))?.experiences).toEqual(info.experiences);
  });

  it('creates independent records with equal names', async () => {
    const saved = service();
    const first = await saved.save(info, null);
    const second = await saved.save(info, null);
    expect(first).not.toBe(second);
    expect(saved.all().length).toBe(2);
  });

  it('stores photos directly as files with unchanged bytes and metadata', async () => {
    const saved = service();
    const photo = new File(['photo bytes'], 'photo.png', { type: 'image/png', lastModified: 123 });
    const id = await saved.save({ ...info, photo }, null);
    const restored = (await service().load(id))!.photo!;
    expect(restored instanceof File).toBeTrue();
    expect(restored.name).toBe(photo.name);
    expect(restored.type).toBe(photo.type);
    expect(restored.lastModified).toBe(123);
    expect(await restored.text()).toBe(await photo.text());
  });

  it('preserves the previous snapshot when a write transaction aborts', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    const original = IDBObjectStore.prototype.put;
    spyOn(IDBObjectStore.prototype, 'put').and.callFake(function (
      this: IDBObjectStore, value: unknown, key?: IDBValidKey
    ) {
      const request = original.call(this, value, key);
      this.transaction.abort();
      return request;
    });
    await expectAsync(saved.save({ ...info, name: 'Lost change' }, id)).toBeRejected();
    expect((await saved.load(id))?.name).toBe(info.name);
    expect(saved.all()[0].info.name).toBe(info.name);
  });

  it('deletes only the chosen record and persists removal', async () => {
    const saved = service();
    const first = await saved.save(info, null);
    const second = await saved.save(info, null);
    await saved.delete(first);
    expect(saved.all().map((record) => record.id)).toEqual([second]);
    expect(await service().load(first)).toBeNull();
    expect(await service().load(second)).toEqual(info);
  });

  it('keeps a record when deletion fails', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    spyOn(IDBObjectStore.prototype, 'delete').and.throwError('Storage unavailable');
    await expectAsync(saved.delete(id)).toBeRejected();
    expect(saved.all().length).toBe(1);
    expect(await saved.load(id)).toEqual(info);
  });

  it('migrates legacy photos and removes local data only after commit', async () => {
    legacy.set(LEGACY_STORAGE_KEY, JSON.stringify([{
      id: 'legacy', info: { ...info, photo: {
        name: 'photo.png', type: 'image/png', base64: btoa('old photo')
      } }
    }]));
    const saved = service();
    const restored = await saved.load('legacy');
    expect(restored?.name).toBe(info.name);
    expect(await restored?.photo?.text()).toBe('old photo');
    expect(legacy.has(LEGACY_STORAGE_KEY)).toBeFalse();
    expect((await service().load('legacy'))?.name).toBe(info.name);
  });

  it('retains corrupt legacy data and allows new IndexedDB saves', async () => {
    legacy.set(LEGACY_STORAGE_KEY, '{"broken":true}');
    const saved = service();
    const id = await saved.save(info, null);
    expect(await saved.load(id)).toEqual(info);
    expect(saved.migrationWarning()).toContain('could not be migrated');
    expect(legacy.get(LEGACY_STORAGE_KEY)).toBe('{"broken":true}');
  });

  it('does not resurrect deleted CVs if removal of the legacy source failed', async () => {
    legacy.set(LEGACY_STORAGE_KEY, JSON.stringify([{ id: 'legacy', info }]));
    (Storage.prototype.removeItem as jasmine.Spy).and.throwError('Unavailable');
    const saved = service();
    expect(await saved.load('legacy')).toEqual(info);
    await saved.delete('legacy');
    expect(await service().load('legacy')).toBeNull();
    expect(legacy.has(LEGACY_STORAGE_KEY)).toBeTrue();
  });

  it('reports estimated site usage and quota, and refreshes after changes', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    expect(saved.storageEstimate()).toEqual({ usedMb: '2.00', quotaGb: '10.00' });
    (navigator.storage.estimate as jasmine.Spy).and.resolveTo({ usage: 0, quota: 1024 ** 3 });
    await saved.delete(id);
    expect(saved.storageEstimate()).toEqual({ usedMb: '0.00', quotaGb: '1.00' });
  });

  it('keeps saving available when storage estimates fail or omit values', async () => {
    const saved = service();
    (navigator.storage.estimate as jasmine.Spy).and.rejectWith(new Error('Unavailable'));
    const id = await saved.save(info, null);
    expect(saved.storageEstimate()).toBeNull();
    expect(await saved.load(id)).toEqual(info);
    (navigator.storage.estimate as jasmine.Spy).and.resolveTo({});
    await saved.refresh();
    expect(saved.storageEstimate()).toBeNull();
    expect(saved.error()).toBe('');
  });
  it('retains the legacy source when migration rolls back', async () => {
    legacy.set(LEGACY_STORAGE_KEY, JSON.stringify([{ id: 'legacy', info }]));
    const original = IDBObjectStore.prototype.put;
    const write = spyOn(IDBObjectStore.prototype, 'put').and.callFake(function (
      this: IDBObjectStore, value: unknown, key?: IDBValidKey
    ) {
      const request = original.call(this, value, key);
      if (this.name === 'cvs') this.transaction.abort();
      return request;
    });
    const saved = service();
    expect(await saved.load('legacy')).toBeNull();
    expect(saved.migrationWarning()).toContain('could not be migrated');
    expect(legacy.has(LEGACY_STORAGE_KEY)).toBeTrue();
    write.and.callThrough();
    expect(await service().load('legacy')).toEqual(info);
    expect(legacy.has(LEGACY_STORAGE_KEY)).toBeFalse();
  });

  it('reports unavailable IndexedDB without discarding legacy data', async () => {
    legacy.set(LEGACY_STORAGE_KEY, JSON.stringify([{ id: 'legacy', info }]));
    spyOn(indexedDB, 'open').and.throwError('Unavailable');
    const saved = service();
    await saved.refresh();
    expect(saved.error()).toContain('could not be read');
    await expectAsync(saved.save(info, null)).toBeRejected();
    expect(legacy.has(LEGACY_STORAGE_KEY)).toBeTrue();
  });  it('stores a photo larger than the former 5 MB local storage limit', async () => {
    const saved = service();
    const photo = new File([new Uint8Array(6 * 1024 ** 2)], 'large.png', { type: 'image/png' });
    const id = await saved.save({ ...info, photo }, null);
    expect((await service().load(id))?.photo?.size).toBe(photo.size);
  });
});

