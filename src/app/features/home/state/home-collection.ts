import { DestroyRef, effect, inject, Injectable, PendingTasks, signal } from '@angular/core';
import { CvCollectionApi } from '../../cv/services/cv-collection-api';
import { SavedCv, SavedCvs } from '../../cv/services/saved-cvs';
import { CvFolder } from '../../cv/interfaces/cv-folder';
import { CvClipboard } from './cv-clipboard';

@Injectable()
export class HomeCollection {
  private readonly api = inject(CvCollectionApi);
  private readonly saved = inject(SavedCvs);
  private readonly pending = inject(PendingTasks);
  private readonly destroyRef = inject(DestroyRef);
  readonly cvs = signal<readonly SavedCv[]>([]);
  readonly folders = signal<readonly CvFolder[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal('');
  readonly moreError = signal('');
  readonly hasMore = signal(false);
  readonly total = signal(0);
  private offset = 0;
  private generation = 0;

  constructor() {
    this.saved.usePagedCache(inject(CvClipboard).cutId());
    void this.saved.updateStorageEstimate();
    effect(() => {
      this.saved.revision();
      // Refreshes may invalidate offsets after an insert, move, import, or reorder.
      void this.reload();
    });
    this.destroyRef.onDestroy(() => this.generation++);
  }

  async reload(): Promise<void> {
    const generation = ++this.generation;
    const loadedCount = Math.max(24, this.offset);
    this.loading.set(true);
    this.loadingMore.set(false);
    this.error.set('');
    this.moreError.set('');
    const done = this.pending.add();
    try {
      const cvs: SavedCv[] = [];
      const folders: CvFolder[] = [];
      let offset = 0;
      let more = false;
      let total = 0;
      do {
        const page = await this.api.getPage(offset, 24);
        if (!this.isCurrent(generation)) return;
        cvs.push(...page.cvs);
        folders.push(...page.folders);
        offset = page.nextOffset;
        more = page.hasMore;
        total = page.total;
      } while (more && offset < loadedCount);
      this.offset = offset;
      this.cvs.set(cvs);
      this.folders.set(folders);
      this.hasMore.set(more);
      this.total.set(total);
      this.saved.cacheCollection(cvs, folders);
    } catch {
      if (this.isCurrent(generation)) this.error.set('Saved CVs could not be read. Please try again.');
    } finally {
      if (this.isCurrent(generation)) this.loading.set(false);
      done();
    }
  }

  async loadMore(): Promise<void> {
    if (this.destroyRef.destroyed || this.loading() || this.loadingMore() || !this.hasMore()) return;
    const generation = this.generation;
    this.loadingMore.set(true);
    this.moreError.set('');
    const done = this.pending.add();
    try {
      const page = await this.api.getPage(this.offset, 24);
      if (!this.isCurrent(generation)) return;
      this.cvs.update((cvs) => [...cvs, ...page.cvs]);
      this.folders.update((folders) => [...folders, ...page.folders]);
      this.offset = page.nextOffset;
      this.total.set(page.total);
      this.hasMore.set(page.hasMore);
      this.saved.cacheCollection(page.cvs, page.folders);
    } catch {
      if (this.isCurrent(generation)) this.moreError.set('More folders and CVs could not be loaded. Please try again.');
    } finally {
      if (this.isCurrent(generation)) this.loadingMore.set(false);
      done();
    }
  }

  private isCurrent(generation: number): boolean {
    return !this.destroyRef.destroyed && generation === this.generation;
  }
}
