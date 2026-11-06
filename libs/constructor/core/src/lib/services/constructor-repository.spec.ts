import { InjectionToken, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { blankDesign } from '../utils/documents/blank-design';
import { ConstructorStorage, provideConstructorStorage } from '../integration/constructor-storage';
import { ConstructorRepository } from './constructor-repository';

const STORAGE = new InjectionToken<ConstructorStorage>('Test constructor storage');

describe('Constructor repository with host-provided storage', () => {
  let storage: jasmine.SpyObj<ConstructorStorage>;
  let repository: ConstructorRepository;

  beforeEach(() => {
    storage = jasmine.createSpyObj<ConstructorStorage>('storage', [
      'list', 'load', 'save', 'delete', 'recentlyVisited', 'recordVisit',
    ]);
    storage.list.and.resolveTo([]);
    storage.load.and.resolveTo(null);
    storage.save.and.resolveTo();
    storage.delete.and.resolveTo();
    storage.recentlyVisited.and.resolveTo([]);
    storage.recordVisit.and.resolveTo();
    TestBed.configureTestingModule({ providers: [
      provideZonelessChangeDetection(),
      { provide: STORAGE, useValue: storage },
      provideConstructorStorage(STORAGE),
    ] });
    repository = TestBed.inject(ConstructorRepository);
  });

  it('saves and reopens a design without a database connection provider', async () => {
    let saved: unknown = null;
    storage.save.and.callFake(async (design) => { saved = structuredClone(design); });
    storage.load.and.callFake(async () => saved);
    const design = blankDesign();
    await repository.save(design);
    expect(await repository.load(design.id)).toEqual(design);
  });

  it('rejects invalid designs before the backend receives a write', async () => {
    await expectAsync(repository.save({ ...blankDesign(), pages: [] })).toBeRejectedWithError();
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('validates raw documents returned by the backend', async () => {
    storage.load.and.resolveTo({ ...blankDesign(), schemaVersion: 99 });
    await expectAsync(repository.load('invalid')).toBeRejectedWithError();
  });

  it('returns null for a missing document', async () => {
    expect(await repository.load('missing')).toBeNull();
  });

  it('retains the six-item recent-design default and supports an explicit limit', async () => {
    await repository.recentlyVisited();
    await repository.recentlyVisited(2);
    expect(storage.recentlyVisited.calls.allArgs()).toEqual([[6], [2]]);
  });

  const operations: readonly {
    name: keyof ConstructorStorage;
    run: (repository: ConstructorRepository) => Promise<unknown>;
  }[] = [
    { name: 'list', run: (repository: ConstructorRepository) => repository.list() },
    { name: 'load', run: (repository: ConstructorRepository) => repository.load('design') },
    { name: 'save', run: (repository: ConstructorRepository) => repository.save(blankDesign()) },
    { name: 'delete', run: (repository: ConstructorRepository) => repository.delete('design') },
    { name: 'recentlyVisited', run: (repository: ConstructorRepository) => repository.recentlyVisited() },
    { name: 'recordVisit', run: (repository: ConstructorRepository) => repository.recordVisit('design') },
  ];

  for (const operation of operations) {
    it(`propagates ${operation.name} backend failures to the caller`, async () => {
      const failure = new Error('Storage is unavailable.');
      storage[operation.name].and.rejectWith(failure);
      await expectAsync(operation.run(repository)).toBeRejectedWith(failure);
    });
  }
});
