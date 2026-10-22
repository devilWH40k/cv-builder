import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, linkedSignal, PendingTasks, signal, untracked, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideAngularModule, Plus, FolderPlus, List, LayoutGrid } from 'lucide-angular';
import { SavedCv, SavedCvs } from '../../../cv/services/saved-cvs';
import { CvCollectionApi } from '../../../cv/services/cv-collection-api';
import { HomeCollection } from '../../state/home-collection';
import { CvDraft } from '../../../cv/services/cv-draft';
import { CvReorder } from '../../../cv/interfaces/cv-reorder';
import { reorderCvs } from '../../../cv/helpers/cv-order';
import { HomeViewStore } from '../../state/home-view-store';
import { CvDragStore } from '../../state/cv-drag-store';
import { CvClipboard } from '../../state/cv-clipboard';
import { CvCollection, CvMove } from '../cv-collection/cv-collection';
import { CreateFolderDialog } from '../create-folder-dialog/create-folder-dialog';
import { FolderDialog } from '../folder-dialog/folder-dialog';
import { DeleteConfirmationService } from '../../../../shared/ui/delete-confirmation/delete-confirmation.service';
import { Tabs, Tab } from '../../../../shared/ui/tabs/tabs';
import { DesignList } from '../../../constructor/components/design-list/design-list';
import { ConstructorRepository } from '../../../constructor/services/constructor-repository';
import { DesignSummary } from '../../../constructor/interfaces/constructor-document';

@Component({
  selector: 'app-home',
  imports: [RouterLink, LucideAngularModule, CvCollection, CreateFolderDialog, FolderDialog, Tabs, DesignList],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HomeCollection]
})
export class Home {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly activeTab = computed(() => this.queryParams().get('tab') === 'designs' ? 'designs' : 'files');
  protected readonly tabs: readonly Tab[] = [
    { id: 'files', label: 'Files', panelId: 'home-files' },
    { id: 'designs', label: 'Designs', panelId: 'home-designs' }
  ];
  private readonly designsRepository = inject(ConstructorRepository);
  protected readonly designs = signal<readonly DesignSummary[]>([]);
  protected readonly designsLoading = signal(false);
  protected readonly designsError = signal('');
  protected readonly deletingDesignIds = signal<readonly string[]>([]);
  protected readonly PlusIcon = Plus;
  protected readonly deleteError = signal('');
  protected readonly FolderPlusIcon = FolderPlus;
  protected readonly ListIcon = List;
  protected readonly GridIcon = LayoutGrid;
  private readonly viewStore = inject(HomeViewStore);
  protected readonly isListView = this.viewStore.isListView;
  protected readonly saved = inject(SavedCvs);
  protected readonly collection = inject(HomeCollection);
  private readonly collectionApi = inject(CvCollectionApi);
  protected readonly createFolderOpen = signal(false);
  protected readonly activeFolderId = signal<string | null>(null);
  protected readonly activeFolder = computed(() => this.saved.folders().find((folder) => folder.id === this.activeFolderId()) ?? null);
  protected readonly rootCvs = computed(() => {
    const movingIds = new Set(this.movingIds());
    return this.orderedCvs(this.collection.cvs()).filter((cv) => !movingIds.has(cv.id));
  });
  protected readonly visibleFolders = this.collection.folders;
  protected readonly visibleCvs = this.rootCvs;
  protected readonly hasMore = this.collection.hasMore;
  protected readonly loadingMore = this.collection.loadingMore;
  private readonly collectionEnd = viewChild<ElementRef<HTMLElement>>('collectionEnd');
  private readonly folderRecords = signal<readonly SavedCv[]>([]);
  protected readonly folderLoading = signal(false);
  private folderGeneration = 0;
  protected readonly folderCvs = computed(() => {
    const movingIds = new Set(this.movingIds());
    return this.orderedCvs(this.folderRecords()).filter((cv) => !movingIds.has(cv.id));
  });
  private readonly pendingReorder = linkedSignal<{
    records: readonly SavedCv[]; folderId: string | null;
  }, CvReorder | null>({
    source: () => ({
      records: this.activeFolderId() ? this.folderRecords() : this.collection.cvs(),
      folderId: this.activeFolderId()
    }),
    computation: (source, previous) => {
      const reorder = previous?.value;
      if (!reorder || source.folderId !== previous.source.folderId) return null;
      // Keep the drop visible until the paged storage refresh confirms its position.
      return reorderCvs(source.records, reorder) === source.records ? null : reorder;
    }
  });
  protected readonly folderError = signal('');
  protected readonly orderError = signal('');
  protected readonly reordering = signal(false);
  protected readonly deletingFolderIds = signal<readonly string[]>([]);
  private readonly movingIds = signal<readonly string[]>([]);
  protected readonly busyCvIds = computed(() => [...this.deletingIds(), ...this.movingIds()]);
  private readonly drag = inject(CvDragStore);
  private readonly pendingTasks = inject(PendingTasks);
  protected readonly deletingIds = signal<readonly string[]>([]);
  private readonly draft = inject(CvDraft);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmation = inject(DeleteConfirmationService);
  private readonly clipboard = inject(CvClipboard);

  constructor() {
    effect(() => {
      if (this.activeTab() === 'designs') void this.pendingTasks.run(() => untracked(() => this.loadDesigns()));
    });
    this.destroyRef.onDestroy(() => {
      this.drag.end();
      this.folderGeneration++;
    });
    effect(() => {
      this.saved.revision();
      const id = this.activeFolderId();
      if (id) void this.pendingTasks.run(() => untracked(() => this.loadFolder(id)));
      else { this.folderGeneration++; this.folderRecords.set([]); }
    });
    afterRenderEffect((onCleanup) => {
      const end = this.collectionEnd()?.nativeElement;
      this.collection.cvs();
      this.collection.folders();
      if (this.activeTab() !== 'files' || !end || this.saved.loading() || this.collection.loading() || this.collection.moreError() || this.loadingMore() || this.activeFolderId() !== null ||
        this.reordering() || this.drag.draggedId()) return;
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        this.loadNextBatch();
      });
      observer.observe(end);
      onCleanup(() => observer.disconnect());
    });
  }

  protected async selectTab(tab: string): Promise<void> {
    await this.router.navigate([], { relativeTo: this.route, queryParams: { tab: tab === 'designs' ? 'designs' : null },
      queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected async loadDesigns(): Promise<void> {
    this.designsLoading.set(true);
    this.designsError.set('');
    try { this.designs.set(await this.designsRepository.list()); }
    catch { this.designsError.set('Saved designs could not be loaded. Please try again.'); }
    finally { this.designsLoading.set(false); }
  }

  protected async deleteDesign(design: DesignSummary): Promise<void> {
    if (this.deletingDesignIds().includes(design.id) || !await this.confirmation.confirm({
      title: 'Delete design', itemName: design.title || 'Untitled design'
    }, this.destroyRef)) return;
    this.deletingDesignIds.update((ids) => [...ids, design.id]);
    this.designsError.set('');
    try {
      await this.designsRepository.delete(design.id);
      this.designs.update((designs) => designs.filter((entry) => entry.id !== design.id));
    } catch { this.designsError.set('This design could not be deleted. Please try again.'); }
    finally { this.deletingDesignIds.update((ids) => ids.filter((id) => id !== design.id)); }
  }

  private loadNextBatch(): void {
    if (!this.destroyRef.destroyed) void this.collection.loadMore();
  }

  private async loadFolder(id: string): Promise<void> {
    const generation = ++this.folderGeneration;
    this.folderLoading.set(true);
    try {
      const records = await this.collectionApi.getFolderCvs(id);
      if (this.destroyRef.destroyed || generation !== this.folderGeneration || this.activeFolderId() !== id) return;
      this.folderRecords.set(records);
      this.saved.cacheCollection(records, []);
    } catch {
      if (!this.destroyRef.destroyed && generation === this.folderGeneration) {
        this.folderError.set('This folder could not be loaded. Please close it and try again.');
      }
    } finally {
      if (!this.destroyRef.destroyed && generation === this.folderGeneration) this.folderLoading.set(false);
    }
  }

  protected async deleteCv(id: string): Promise<void> {
    if (this.busyCvIds().includes(id)) return;
    const cv = this.saved.all().find((cv) => cv.id === id);
    if (!cv || !await this.confirmation.confirm({
      title: 'Delete CV', itemName: cv.info.name || 'Untitled CV'
    }, this.destroyRef) || this.destroyRef.destroyed || this.busyCvIds().includes(id)) return;
    const done = this.pendingTasks.add();
    this.deletingIds.update((ids) => [...ids, id]);
    this.deleteError.set('');
    try {
      await this.saved.delete(id);
      this.clipboard.clear(id);
      if (this.draft.savedId() === id) this.draft.reset();
    } catch {
      this.deleteError.set('Could not delete this CV. Browser storage may be unavailable. Please try again.');
    } finally {
      this.deletingIds.update((ids) => ids.filter((item) => item !== id));
      done();
    }
  }

  protected startNew(): void { if (this.activeTab() === 'files') this.draft.reset(); }

  protected toggleView(): void { this.viewStore.toggleView(); }

  protected openFolder(id: string): void {
    this.folderError.set('');
    this.deleteError.set('');
    this.activeFolderId.set(id);
  }

  protected async deleteFolder(id: string): Promise<void> {
    if (this.deletingFolderIds().includes(id)) return;
    const folder = this.saved.folders().find((folder) => folder.id === id);
    if (!folder || !await this.confirmation.confirm({
      title: 'Delete folder', itemName: folder.name
    }, this.destroyRef) || this.destroyRef.destroyed || this.deletingFolderIds().includes(id)) return;
    this.deletingFolderIds.update((ids) => [...ids, id]);
    this.folderError.set('');
    const done = this.pendingTasks.add();
    try { await this.saved.deleteFolder(id); }
    catch { this.folderError.set('This folder could not be deleted. Only empty folders can be deleted. Please try again.'); }
    finally {
      this.deletingFolderIds.update((ids) => ids.filter((entry) => entry !== id));
      done();
    }
  }

  protected async moveCv({ cvId, folderId }: CvMove): Promise<void> {
    if (this.busyCvIds().includes(cvId)) return;
    this.movingIds.update((ids) => [...ids, cvId]);
    this.folderError.set('');
    const done = this.pendingTasks.add();
    try {
      await this.saved.moveCv(cvId, folderId);
      this.clipboard.clear(cvId);
    }
    catch { this.folderError.set('This CV could not be moved. Browser storage may be unavailable. Please try again.'); }
    finally {
      this.movingIds.update((ids) => ids.filter((entry) => entry !== cvId));
      done();
    }
  }

  protected async reorderCv(reorder: CvReorder): Promise<void> {
    if (this.reordering() || this.busyCvIds().includes(reorder.cvId) || this.busyCvIds().includes(reorder.targetId)) return;
    this.reordering.set(true);
    this.pendingReorder.set(reorder);
    this.orderError.set('');
    const done = this.pendingTasks.add();
    try { await this.saved.reorderCv(reorder); }
    catch {
      this.pendingReorder.set(null);
      this.orderError.set('The CV order could not be saved. Please try again.');
    }
    finally { this.reordering.set(false); done(); }
  }

  private orderedCvs(cvs: readonly SavedCv[]): readonly SavedCv[] {
    const reorder = this.pendingReorder();
    return reorder ? reorderCvs(cvs, reorder) : cvs;
  }

  protected async pasteCv(folderId: string | null): Promise<void> {
    const cvId = this.clipboard.cutId();
    if (!cvId || this.busyCvIds().includes(cvId) || this.reordering() ||
      folderId !== null && (this.deletingFolderIds().includes(folderId) || !this.saved.folders().some((folder) => folder.id === folderId))) return;
    const done = this.pendingTasks.add();
    try {
      const currentFolder = await this.collectionApi.getLocation(cvId);
      if (currentFolder === undefined) { this.clipboard.clear(cvId); return; }
      if (currentFolder === folderId) { this.clipboard.clear(cvId); return; }
      await this.moveCv({ cvId, folderId });
    } catch {
      this.folderError.set('This CV could not be moved. Please try again.');
    } finally { done(); }
  }
}
