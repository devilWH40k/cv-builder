import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CV_DATABASE_NAME } from '../../cv/services/cv-database';
import { ConstructorRepository } from './constructor-repository';
import { blankDesign } from '../helpers/preview-to-design';

describe('Constructor storage', () => {
  let name: string;
  beforeEach(() => {
    name = `constructor-${crypto.randomUUID()}`;
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: CV_DATABASE_NAME, useValue: name }],
    });
    spyOn(Storage.prototype, 'getItem').and.returnValue(null);
  });
  afterEach(async () => {
    TestBed.resetTestingModule();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Database is still open.'));
    });
  });

  it('saves, lists, reopens and deletes independent design documents', async () => {
    const repository = TestBed.inject(ConstructorRepository);
    const original = blankDesign();
    await repository.save(original);
    expect(await repository.load(original.id)).toEqual(original);
    expect((await repository.list()).map((design) => design.id)).toEqual([original.id]);
    await repository.delete(original.id);
    expect(await repository.load(original.id)).toBeNull();
  });

  it('orders recent designs by visits without changing document modification times', async () => {
    const repository = TestBed.inject(ConstructorRepository);
    const first = { ...blankDesign(), title: 'First', updatedAt: 100 };
    const second = { ...blankDesign(), title: 'Second', updatedAt: 300 };
    const unvisited = { ...blankDesign(), title: 'Never opened', updatedAt: 500 };
    for (const design of [first, second, unvisited]) await repository.save(design);
    expect(await repository.recentlyVisited()).toEqual([]);
    const clock = spyOn(Date, 'now').and.returnValue(1000);
    await repository.recordVisit(second.id);
    clock.and.returnValue(2000);
    await repository.recordVisit(first.id);
    expect((await repository.recentlyVisited()).map((design) => design.id)).toEqual([
      first.id,
      second.id,
    ]);
    expect((await repository.recentlyVisited(1))[0].visitedAt).toBe(2000);
    expect((await repository.load(first.id))?.updatedAt).toBe(100);
    expect((await repository.list()).map((design) => design.id)).toEqual([
      unvisited.id,
      second.id,
      first.id,
    ]);
    await repository.delete(first.id);
    expect((await repository.recentlyVisited()).map((design) => design.id)).toEqual([second.id]);
  });

  it('upgrades existing databases without losing CV records', async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('cvs', { keyPath: 'id' });
        store.put({ id: 'existing-cv', updatedAt: 1, info: { name: 'Original CV' } });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
    });
    const repository = TestBed.inject(ConstructorRepository);
    await repository.save(blankDesign());
    const { CvDatabase, completed } = await import('../../cv/services/cv-database');
    const database = await TestBed.inject(CvDatabase).open();
    const transaction = database.transaction('cvs', 'readonly');
    const request = transaction.objectStore('cvs').get('existing-cv');
    await completed(transaction);
    expect(request.result.info.name).toBe('Original CV');
  });
});
