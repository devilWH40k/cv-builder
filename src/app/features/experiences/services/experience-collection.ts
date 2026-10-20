import { computed, DestroyRef, effect, inject, Injectable, PendingTasks, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, Subject } from 'rxjs';
import { SavedExperience } from '../../cv/interfaces/experience';
import { SavedCvs } from '../../cv/services/saved-cvs';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ExperienceSearch, ExperiencesApi } from './experiences-api';

@Injectable()
export class ExperienceCollection {
  readonly records = signal<readonly SavedExperience[]>([]);
  readonly loading = signal(true);
  private readonly hasLoaded = signal(false);
  readonly initialLoading = computed(() => this.loading() && !this.hasLoaded());
  readonly searchPending = signal(false);
  readonly loadingMore = signal(false);
  readonly failed = signal(false);
  readonly moreError = signal('');
  readonly hasMore = signal(false);
  private readonly api = inject(ExperiencesApi);
  private readonly pending = inject(PendingTasks);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toasts = inject(ToastService);
  private readonly searches = new Subject<number>();
  private search: ExperienceSearch = { query: '', columns: [] };
  private initialized = false;
  private offset = 0;
  private generation = 0;
  private controller: AbortController | null = null;
  private finishDebounce: (() => void) | null = null;

  constructor() {
    this.searches.pipe(debounceTime(200), takeUntilDestroyed()).subscribe((generation) => {
      if (!this.isCurrent(generation)) return;
      const finish = this.finishDebounce;
      this.finishDebounce = null;
      this.searchPending.set(false);
      void this.fetchPages(generation, 24, true).finally(() => finish?.());
    });
    const saved = inject(SavedCvs);
    const initialRevision = saved.importRevision();
    effect(() => {
      if (saved.importRevision() !== initialRevision) untracked(() => void this.reload());
    });
    this.destroyRef.onDestroy(() => {
      this.generation++;
      this.controller?.abort();
      this.finishDebounce?.();
      this.searches.complete();
    });
  }

  setSearch(search: ExperienceSearch): void {
    const normalized = { query: search.query.trim().toLocaleLowerCase(), columns: [...new Set(search.columns)].sort() };
    if (this.initialized && normalized.query === this.search.query &&
      (!normalized.query || normalized.columns.join('\0') === this.search.columns.join('\0'))) return;
    this.search = normalized;
    const generation = ++this.generation;
    this.controller?.abort();
    this.finishDebounce?.();
    this.finishDebounce = null;
    this.loadingMore.set(false);
    if (!this.initialized) {
      this.initialized = true;
      void this.fetchPages(generation, 24, true);
    } else {
      this.searchPending.set(true);
      this.finishDebounce = this.pending.add();
      this.searches.next(generation);
    }
  }

  async reload(): Promise<void> {
    if (!this.initialized || this.destroyRef.destroyed) return;
    const generation = ++this.generation;
    this.controller?.abort();
    this.finishDebounce?.();
    this.finishDebounce = null;
    this.searchPending.set(false);
    this.loadingMore.set(false);
    await this.fetchPages(generation, Math.max(24, this.offset));
  }

  private async fetchPages(generation: number, target: number, resetOffset = false): Promise<void> {
    const controller = new AbortController();
    this.controller = controller;
    this.loading.set(true);
    this.failed.set(false);
    this.moreError.set('');
    if (resetOffset) this.offset = 0;
    const done = this.pending.add();
    try {
      const records: SavedExperience[] = [];
      let offset = 0;
      let more: boolean;
      do {
        const page = await this.api.getPage(offset, 24, this.search, controller.signal);
        if (!this.isCurrent(generation)) return;
        records.push(...page.records);
        offset = page.nextOffset;
        more = page.hasMore;
      } while (more && offset < target);
      this.records.set(records);
      this.offset = offset;
      this.hasMore.set(more);
      this.hasLoaded.set(true);
    } catch {
      if (this.isCurrent(generation)) {
        this.failed.set(true);
        this.toasts.show('danger', 'Saved experiences could not be loaded. Please try again.');
      }
    } finally {
      if (this.isCurrent(generation)) this.loading.set(false);
      if (this.controller === controller) this.controller = null;
      done();
    }
  }

  async loadMore(): Promise<void> {
    if (this.destroyRef.destroyed || this.loading() || this.loadingMore() || this.searchPending() || this.failed() || !this.hasMore()) return;
    const generation = this.generation;
    const controller = new AbortController();
    this.controller = controller;
    this.loadingMore.set(true);
    this.moreError.set('');
    const done = this.pending.add();
    try {
      const page = await this.api.getPage(this.offset, 24, this.search, controller.signal);
      if (!this.isCurrent(generation)) return;
      this.records.update((records) => [...records, ...page.records]);
      this.offset = page.nextOffset;
      this.hasMore.set(page.hasMore);
    } catch {
      if (this.isCurrent(generation)) this.moreError.set('More experiences could not be loaded. Please try again.');
    } finally {
      if (this.isCurrent(generation)) this.loadingMore.set(false);
      if (this.controller === controller) this.controller = null;
      done();
    }
  }

  private isCurrent(generation: number): boolean {
    return !this.destroyRef.destroyed && generation === this.generation;
  }
}
