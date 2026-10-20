import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Experiences } from './experiences';
import { ExperiencesApi } from './services/experiences-api';
import { SavedCvs } from '../cv/services/saved-cvs';
import { SavedExperience } from '../cv/interfaces/experience';

describe('Experiences scroll paging', () => {
  let endReached: () => void;
  const records: SavedExperience[] = Array.from({ length: 55 }, (_, index) => ({
    id: `experience-${index}`, updatedAt: index, experience: { company: `Project ${index}`, position: '',
      startDate: '', endDate: '', isCurrent: false, technologies: [], description: '' }
  }));

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    spyOn(window, 'IntersectionObserver').and.callFake(function (callback) {
      const observer: IntersectionObserver = { root: null, rootMargin: '0px', thresholds: [0],
        observe: (element) => {
          endReached = () => {
            const bounds = element.getBoundingClientRect();
            callback([{ target: element, time: 0, isIntersecting: true, intersectionRatio: 1,
              boundingClientRect: bounds, intersectionRect: bounds, rootBounds: null }], observer);
          };
        }, unobserve: () => undefined, disconnect: () => undefined, takeRecords: () => [] };
      return observer;
    });
  });

  it('requests offset pages of 24 only as the user reaches the end', async () => {
    const bulkRead = spyOn(TestBed.inject(SavedCvs), 'listExperiences');
    const read = spyOn(TestBed.inject(ExperiencesApi), 'getPage').and.callFake(async (offset = 0, limit = 24) => ({
      records: records.slice(offset, offset + limit), nextOffset: Math.min(records.length, offset + limit), hasMore: offset + limit < records.length
    }));
    const fixture = TestBed.createComponent(Experiences);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const rows = () => root.querySelectorAll('app-table-row');
    expect(rows().length).toBe(24);
    expect(read.calls.count()).toBe(1);
    const first = rows()[0];
    endReached();
    endReached();
    fixture.detectChanges();
    expect(root.querySelector('.experiences-end')?.textContent).toContain('Loading more experiences');
    await fixture.whenStable();
    expect(rows().length).toBe(48);
    expect(rows()[0]).toBe(first);
    endReached();
    await fixture.whenStable();
    expect(rows().length).toBe(55);
    expect(root.querySelector('.experiences-end')).toBeNull();
    expect(read.calls.allArgs().map((args) => args.slice(0, 2))).toEqual([[0, 24], [24, 24], [48, 24]]);
    expect(bulkRead).not.toHaveBeenCalled();
  });

  it('shows the first API search page and waits for another scroll before fetching more matches', async () => {
    const matching = records.map((record) => ({ ...record, experience: { ...record.experience, company: 'Matching project' } }));
    const read = spyOn(TestBed.inject(ExperiencesApi), 'getPage').and.callFake(async (offset = 0, limit = 24, search) => ({
      records: (search?.query ? matching : records).slice(offset, offset + limit),
      nextOffset: Math.min(records.length, offset + limit), hasMore: offset + limit < records.length
    }));
    const fixture = TestBed.createComponent(Experiences);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const search = root.querySelector<HTMLInputElement>('#experience-search')!;
    search.value = 'matching';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(read.calls.count()).toBe(2);
    expect(read.calls.mostRecent().args[0]).toBe(0);
    expect(read.calls.mostRecent().args[2]?.query).toBe('matching');
    expect(root.querySelectorAll('app-table-row').length).toBe(24);
    expect(root.querySelector('app-table-row')?.textContent).toContain('Matching project');
    endReached();
    await fixture.whenStable();
    expect(read.calls.mostRecent().args[0]).toBe(24);
    expect(root.querySelectorAll('app-table-row').length).toBe(48);
  });
});
