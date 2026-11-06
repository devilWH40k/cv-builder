import { InjectionToken, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { blankDesign, ConstructorRepository } from 'constructor/core';
import { ConstructorIndexedDbDatabase } from './constructor-indexeddb-database';
import { provideConstructorIndexedDbStorage } from './provide-constructor-indexeddb-storage';
import { completed } from './utils/storage-transaction';

const DATABASE = new InjectionToken<ConstructorIndexedDbDatabase>('Test IndexedDB connection');
const VISITS_KEY = 'constructor-recent-visits';

describe('IndexedDB constructor storage', () => {
  let name: string;
  let database: IDBDatabase;
  let repository: ConstructorRepository;

  beforeEach(async () => {
    name = 'constructor-adapter-' + crypto.randomUUID();
    database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('constructor-designs', { keyPath: 'id' });
        request.result.createObjectStore('metadata');
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    TestBed.configureTestingModule({ providers: [
      provideZonelessChangeDetection(),
      { provide: DATABASE, useValue: { open: () => Promise.resolve(database) } },
      provideConstructorIndexedDbStorage(DATABASE),
    ] });
    repository = TestBed.inject(ConstructorRepository);
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    database.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Test connection is still open.'));
    });
  });

  async function metadata(): Promise<unknown> {
    const transaction = database.transaction('metadata', 'readonly');
    const request: IDBRequest<unknown> = transaction.objectStore('metadata').get(VISITS_KEY);
    await completed(transaction);
    return request.result;
  }

  it('preserves existing visit metadata, ignores invalid/missing entries, and orders summaries', async () => {
    const first = { ...blankDesign(), updatedAt: 100 };
    const second = { ...blankDesign(), updatedAt: 200 };
    const invalidVisit = { ...blankDesign(), updatedAt: 300 };
    for (const design of [first, second, invalidVisit]) await repository.save(design);
    const transaction = database.transaction('metadata', 'readwrite');
    transaction.objectStore('metadata').put({
      [first.id]: 2000, [second.id]: 1000, [invalidVisit.id]: 'invalid', missing: 3000,
    }, VISITS_KEY);
    await completed(transaction);
    expect((await repository.list()).map((design) => design.id)).toEqual([invalidVisit.id, second.id, first.id]);
    expect((await repository.recentlyVisited()).map((design) => design.id)).toEqual([first.id, second.id]);
    expect((await repository.recentlyVisited(1))[0].visitedAt).toBe(2000);
    expect(await repository.recentlyVisited(0)).toEqual([]);
  });

  it('ignores visits to missing designs and retains simultaneous visits without changing designs', async () => {
    await repository.recordVisit('missing');
    expect(await metadata()).toBeUndefined();
    const first = { ...blankDesign(), updatedAt: 100 };
    const second = { ...blankDesign(), updatedAt: 200 };
    await repository.save(first);
    await repository.save(second);
    spyOn(Date, 'now').and.returnValue(3000);
    await Promise.all([repository.recordVisit(first.id), repository.recordVisit(second.id)]);
    expect(await metadata()).toEqual({ [first.id]: 3000, [second.id]: 3000 });
    expect(await repository.load(first.id)).toEqual(first);
    expect(await repository.load(second.id)).toEqual(second);
  });

  it('rolls back deletion when updating visit metadata fails', async () => {
    const design = blankDesign();
    await repository.save(design);
    await repository.recordVisit(design.id);
    const visits = await metadata();
    const put = IDBObjectStore.prototype.put;
    spyOn(IDBObjectStore.prototype, 'put').and.callFake(function (
      this: IDBObjectStore, value: unknown, key?: IDBValidKey,
    ): IDBRequest<IDBValidKey> {
      const request = put.call(this, value, key);
      if (this.name === 'metadata' && key === VISITS_KEY) this.transaction.abort();
      return request;
    });
    await expectAsync(repository.delete(design.id)).toBeRejected();
    expect(await repository.load(design.id)).toEqual(design);
    expect(await metadata()).toEqual(visits);
  });
});
