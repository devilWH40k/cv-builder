import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';
import { SavedCv, SavedCvs } from '../../../cv/services/saved-cvs';
import { CvFolder } from '../../../cv/interfaces/cv-folder';
import { CvDragStore } from '../../state/cv-drag-store';
import { CvCollectionApi } from '../../../cv/services/cv-collection-api';

describe('Main collection scroll batches', () => {
  let observers: ControlledObserver[];

  class ControlledObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '0px';
    readonly thresholds = [0];
    readonly observe = jasmine.createSpy<(target: Element) => void>('observe');
    readonly unobserve = jasmine.createSpy<(target: Element) => void>('unobserve');
    readonly disconnect = jasmine.createSpy('disconnect');
    readonly takeRecords = () => [];

    constructor(private readonly callback: IntersectionObserverCallback) { observers.push(this); }

    intersect(isIntersecting = true): void {
      const target = this.observe.calls.mostRecent().args[0];
      const bounds = target.getBoundingClientRect();
      this.callback([{ target, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0,
        time: performance.now(), boundingClientRect: bounds, intersectionRect: bounds, rootBounds: null }], this);
    }
  }

  beforeEach(() => {
    observers = [];
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
    spyOn(Storage.prototype, 'getItem').and.returnValue('list');
    spyOn(Storage.prototype, 'setItem').and.stub();
    spyOn(window, 'IntersectionObserver').and.callFake(function (callback) {
      return new ControlledObserver(callback);
    });
  });

  async function setup(cvCount: number, folderCount: number, view = 'list') {
    const cvs = signal<readonly SavedCv[]>(Array.from({ length: cvCount }, (_, index) => ({
      id: `cv-${index}`, updatedAt: index, info: { name: `CV ${index}`, positionTitle: '', description: '',
        photo: null, technologies: [], experiences: [], languages: [] }
    })));
    const folders = signal<readonly CvFolder[]>(Array.from({ length: folderCount }, (_, index) => ({
      id: `folder-${index}`, name: `Folder ${index}`, cvIds: []
    })));
    const saved = TestBed.inject(SavedCvs);
    const revision = signal(0);
    spyOn(saved, 'revision').and.callFake(revision);
    const refresh = spyOn(saved, 'refresh').and.resolveTo();
    const getPage = spyOn(TestBed.inject(CvCollectionApi), 'getPage').and.callFake(async (offset = 0, limit = 24) => {
      const total = folders().length + cvs().length;
      const nextOffset = Math.min(total, offset + limit);
      return { folders: folders().slice(offset, offset + limit),
        cvs: cvs().slice(Math.max(0, offset - folders().length), Math.max(0, offset + limit - folders().length)),
        total, nextOffset, hasMore: nextOffset < total };
    });
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    if (view === 'card') {
      page.querySelector<HTMLButtonElement>('.view-toggle')!.click();
      await fixture.whenStable();
    }
    return { fixture, page, cvs, folders, saved, getPage, refresh, revision };
  }

  for (const view of ['card', 'list']) {
    for (const [cvCount, folderCount] of [[55, 0], [45, 10], [0, 55]]) {
      it(`renders ${view} items in combined batches of 24 (${folderCount} folders, ${cvCount} CVs)`, async () => {
        const { fixture, page, getPage, refresh } = await setup(cvCount, folderCount, view);
        const cards = () => page.querySelectorAll('.root-collection .saved-card');
        expect(cards().length).toBe(24);
        expect(getPage).toHaveBeenCalledOnceWith(0, 24);
        expect(refresh).not.toHaveBeenCalled();
        expect(page.querySelectorAll('.saved-folder').length).toBe(Math.min(folderCount, 24));
        expect(page.querySelector('.collection-end')?.textContent?.trim()).toBe('');
        observers.at(-1)!.intersect(false);
        await fixture.whenStable();
        expect(cards().length).toBe(24);
        const first = cards()[0];
        const observer = observers.at(-1)!;
        observer.intersect();
        observer.intersect();
        fixture.detectChanges();
        expect(page.querySelector('.collection-end')?.textContent).toContain('Loading more folders and CVs');
        expect(cards().length).toBe(24);
        await fixture.whenStable();
        expect(cards().length).toBe(48);
        expect(getPage.calls.allArgs()).toEqual([[0, 24], [24, 24]]);
        expect(cards()[0]).toBe(first);
        expect(observer.disconnect).toHaveBeenCalled();
        observers.at(-1)!.intersect();
        await fixture.whenStable();
        expect(cards().length).toBe(55);
        expect(getPage.calls.allArgs()).toEqual([[0, 24], [24, 24], [48, 24]]);
        expect(page.querySelector('.collection-end')).toBeNull();
        const cvIds = Array.from(page.querySelectorAll('[data-cv-id]'), (element) => element.getAttribute('data-cv-id'));
        expect(cvIds).toEqual(Array.from({ length: cvCount }, (_, index) => `cv-${index}`));
      });
    }
  }

  it('keeps the loaded batch when switching views and includes new records on refresh', async () => {
    const { fixture, page, cvs, revision } = await setup(60, 0);
    observers.at(-1)!.intersect();
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('.view-toggle')!.click();
    await fixture.whenStable();
    expect(page.querySelectorAll('[data-cv-id]').length).toBe(48);
    cvs.update((records) => [{ ...records[0], id: 'new-cv' }, ...records]);
    revision.update((value) => value + 1);
    await fixture.whenStable();
    expect(page.querySelector('[data-cv-id]')?.getAttribute('data-cv-id')).toBe('new-cv');
    expect(page.querySelectorAll('[data-cv-id]').length).toBe(48);
  });

  it('does not observe completed or empty collections', async () => {
    const { page } = await setup(10, 10);
    expect(page.querySelector('.collection-end')).toBeNull();
    expect(observers.length).toBe(0);
  });

  it('keeps loaded items on a failed next-page request and retries the same offset', async () => {
    const { fixture, page, getPage, cvs } = await setup(60, 0);
    getPage.and.rejectWith(new Error('Storage unavailable'));
    observers.at(-1)!.intersect();
    await fixture.whenStable();
    expect(page.querySelectorAll('[data-cv-id]').length).toBe(24);
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('could not be loaded');
    expect(getPage.calls.mostRecent().args).toEqual([24, 24]);
    getPage.and.resolveTo({ cvs: cvs().slice(24, 48), folders: [], nextOffset: 48, total: 60, hasMore: true });
    page.querySelector<HTMLButtonElement>('.load-retry')!.click();
    await fixture.whenStable();
    expect(getPage.calls.mostRecent().args).toEqual([24, 24]);
    expect(page.querySelectorAll('[data-cv-id]').length).toBe(48);
    expect(page.querySelector('[role="alert"]')).toBeNull();
  });

  it('pauses the main collection observer during CV drags', async () => {
    const draggedId = signal<string | null>(null);
    spyOn(TestBed.inject(CvDragStore), 'draggedId').and.callFake(draggedId);
    const { fixture } = await setup(60, 0);
    const first = observers.at(-1)!;
    draggedId.set('cv-0');
    await fixture.whenStable();
    expect(first.disconnect).toHaveBeenCalled();
    const count = observers.length;
    draggedId.set(null);
    await fixture.whenStable();
    expect(observers.length).toBe(count + 1);
  });

  it('disconnects and cancels pending work when leaving the main page', async () => {
    const { fixture } = await setup(60, 0);
    const observer = observers.at(-1)!;
    observer.intersect();
    fixture.destroy();
    await fixture.whenStable();
    expect(observer.disconnect).toHaveBeenCalled();
    expect(() => observer.intersect()).not.toThrow();
  });
});
