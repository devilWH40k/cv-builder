import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ExperienceCollection } from './experience-collection';
import { ExperiencePage, ExperiencesApi } from './experiences-api';
import { SavedExperience } from '../../cv/interfaces/experience';

describe('Experience search and page state', () => {
  const records: SavedExperience[] = Array.from({ length: 60 }, (_, index) => ({
    id: `experience-${index}`, updatedAt: index, experience: { company: `Project ${index}`, position: 'Engineer',
      startDate: '', endDate: '', isCurrent: false, description: '', technologies: [] }
  }));
  const page = (offset: number): ExperiencePage => ({ records: records.slice(offset, offset + 24),
    nextOffset: Math.min(offset + 24, records.length), hasMore: offset + 24 < records.length });

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), ExperienceCollection] }));

  async function settle(): Promise<void> {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  }

  async function setup() {
    const read = spyOn(TestBed.inject(ExperiencesApi), 'getPage').and.callFake(async (offset = 0) => page(offset));
    const collection = TestBed.inject(ExperienceCollection);
    collection.setSearch({ query: '', columns: ['company', 'position'] });
    await settle();
    return { collection, read };
  }

  it('waits 200ms after the last search input and resets to the first 24 matching results', async () => {
    const { collection, read } = await setup();
    await collection.loadMore();
    expect(collection.records().length).toBe(48);
    read.calls.reset();
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date());
    try {
      collection.setSearch({ query: 'engi', columns: ['position'] });
      jasmine.clock().tick(199);
      expect(read).not.toHaveBeenCalled();
      collection.setSearch({ query: 'Engineer', columns: ['position'] });
      jasmine.clock().tick(199);
      expect(read).not.toHaveBeenCalled();
      jasmine.clock().tick(1);
      await settle();
      expect(read).toHaveBeenCalledTimes(1);
      expect(read.calls.mostRecent().args.slice(0, 3)).toEqual([0, 24, { query: 'engineer', columns: ['position'] }]);
      expect(collection.records().length).toBe(24);
      expect(collection.hasMore()).toBeTrue();
      // More matching results are not fetched until another batch is requested.
      jasmine.clock().tick(1000);
      expect(read).toHaveBeenCalledTimes(1);
      await collection.loadMore();
      expect(read.calls.mostRecent().args[0]).toBe(24);
      expect(collection.records().length).toBe(48);
      collection.setSearch({ query: '', columns: ['company', 'position'] });
      jasmine.clock().tick(200);
      await settle();
      expect(read.calls.mostRecent().args[0]).toBe(0);
      expect(collection.records().length).toBe(24);
    } finally { jasmine.clock().uninstall(); }
  });

  it('aborts the previous request and ignores its response when a newer search finishes first', async () => {
    const { collection, read } = await setup();
    let finishOld!: (result: ExperiencePage) => void;
    const old = new Promise<ExperiencePage>((resolve) => { finishOld = resolve; });
    const latest = { ...records[0], id: 'latest-result' };
    read.and.returnValues(old, Promise.resolve({ records: [latest], nextOffset: 1, hasMore: false }));
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date());
    try {
      collection.setSearch({ query: 'old', columns: ['company'] });
      jasmine.clock().tick(200);
      const oldSignal = read.calls.mostRecent().args[3]!;
      collection.setSearch({ query: 'latest', columns: ['company'] });
      expect(oldSignal.aborted).toBeTrue();
      jasmine.clock().tick(200);
      await settle();
      expect(collection.records().map((record) => record.id)).toEqual(['latest-result']);
      finishOld(page(0));
      await settle();
      expect(collection.records().map((record) => record.id)).toEqual(['latest-result']);
    } finally { jasmine.clock().uninstall(); }
  });

  it('retains loaded results after a failed batch and retries the same offset once', async () => {
    const { collection, read } = await setup();
    read.and.rejectWith(new Error('Storage failed'));
    await collection.loadMore();
    expect(collection.records().length).toBe(24);
    expect(collection.moreError()).toContain('could not be loaded');
    read.and.resolveTo(page(24));
    const first = collection.loadMore();
    const duplicate = collection.loadMore();
    await Promise.all([first, duplicate]);
    expect(read.calls.mostRecent().args[0]).toBe(24);
    expect(collection.records().length).toBe(48);
    expect(collection.moreError()).toBe('');
    expect(read.calls.count()).toBe(3);
  });
});
