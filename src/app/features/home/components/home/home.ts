import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, PendingTasks, signal, untracked, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Plus, FolderPlus, List, LayoutGrid } from 'lucide-angular';
import { SavedCv, SavedCvs } from '../../../cv/services/saved-cvs';
import { CvCollectionApi } from '../../../cv/services/cv-collection-api';
import { HomeCollection } from '../../state/home-collection';
import { CvDraft } from '../../../cv/services/cv-draft';
import { CvReorder } from '../../../cv/interfaces/cv-reorder';
import { HomeViewStore } from '../../state/home-view-store';
import { CvDragStore } from '../../state/cv-drag-store';
import { CvClipboard } from '../../state/cv-clipboard';
import { CvCollection, CvMove } from '../cv-collection/cv-collection';
import { CreateFolderDialog } from '../create-folder-dialog/create-folder-dialog';
import { FolderDialog } from '../folder-dialog/folder-dialog';
import { DeleteConfirmationService } from '../../../../shared/ui/delete-confirmation/delete-confirmation.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, LucideAngularModule, CvCollection, CreateFolderDialog, FolderDialog],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HomeCollection]
})
export class Home {
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
    return this.collection.cvs().filter((cv) => !movingIds.has(cv.id));
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
    return this.folderRecords().filter((cv) => !movingIds.has(cv.id));
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
      if (!end || this.saved.loading() || this.collection.loading() || this.collection.moreError() || this.loadingMore() || this.activeFolderId() !== null ||
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

  protected startNew(): void { this.draft.reset(); }

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
    this.orderError.set('');
    const done = this.pendingTasks.add();
    try { await this.saved.reorderCv(reorder); }
    catch { this.orderError.set('The CV order could not be saved. Please try again.'); }
    finally { this.reordering.set(false); done(); }
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
