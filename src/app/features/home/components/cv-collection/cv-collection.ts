import { DatePipe, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, linkedSignal, output, signal, viewChild, viewChildren } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ClipboardPaste, Download, ExternalLink, Eye, FileText, Folder, FolderOpen, LucideAngularModule, Scissors, Trash2 } from 'lucide-angular';
import { ContextMenu, ContextMenuItem } from '../../../../shared/ui/context-menu/context-menu';
import { CvClipboard } from '../../state/cv-clipboard';
import { CvFolder } from '../../../cv/interfaces/cv-folder';
import { CvDraft } from '../../../cv/services/cv-draft';
import { SavedCv } from '../../../cv/services/saved-cvs';
import { CvPdf } from '../../../cv/services/cv-pdf';
import { CvReorder } from '../../../cv/interfaces/cv-reorder';
import { CvPreviewDialog } from '../cv-preview-dialog/cv-preview-dialog';
import { CvDragStore, CV_DRAG_TYPE } from '../../state/cv-drag-store';
import { Draggable } from '../../../../shared/ui/draggable/draggable';
import { DropTarget } from '../../../../shared/ui/draggable/drop-target';
import { DragDrop, DragItem } from '../../../../shared/ui/draggable/drag-drop';
import { CvInsertion, CvInsertionTarget } from './cv-insertion-target';
import { CvCollectionMotion } from './cv-collection-motion';
import { formatCompactRelativeTime } from '../../../../shared/utils/compact-relative-time';

export interface CvMove {
  readonly cvId: string;
  readonly folderId: string | null;
}

interface InsertionSource {
  readonly item: DragItem | null;
  readonly target: CvInsertion | null;
  readonly allowed: boolean;
  readonly overCollection: boolean;
}

type CvMenuContext = { readonly kind: 'cv'; readonly cv: SavedCv }
  | { readonly kind: 'folder'; readonly folder: CvFolder }
  | { readonly kind: 'background' };

@Component({
  selector: 'app-cv-collection',
  imports: [RouterLink, LucideAngularModule, Draggable, DropTarget, CvInsertionTarget, CvCollectionMotion, DatePipe, CvPreviewDialog, ContextMenu],
  templateUrl: './cv-collection.html',
  styleUrls: ['./cv-collection.scss', './cv-collection-order.scss', './cv-collection-clipboard.scss', './cv-collection-folder-icon.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CvCollection {
  readonly cvs = input.required<readonly SavedCv[]>();
  readonly folders = input<readonly CvFolder[]>([]);
  readonly isListView = input(false);
  readonly deletingIds = input<readonly string[]>([]);
  readonly deletingFolderIds = input<readonly string[]>([]);
  readonly reorderDisabled = input(false);
  readonly folderId = input<string | null>(null);
  readonly folderOpened = output<string>();
  readonly folderDeleted = output<string>();
  readonly cvDeleted = output<string>();
  readonly moved = output<CvMove>();
  readonly reordered = output<CvReorder>();
  readonly pasteRequested = output<string | null>();
  protected readonly clipboard = inject(CvClipboard);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly contextMenu = viewChild.required(ContextMenu);
  private readonly menuContext = signal<CvMenuContext>({ kind: 'background' });
  protected readonly menuItems = computed<readonly ContextMenuItem[]>(() => {
    const context = this.menuContext();
    const cutId = this.clipboard.cutId();
    const destination = context.kind === 'folder' ? context.folder.id : this.folderId();
    const paste: ContextMenuItem = {
      id: 'paste', label: 'Paste', icon: ClipboardPaste,
      disabled: !cutId || this.deletingIds().includes(cutId) || this.reorderDisabled() ||
        !!destination && this.deletingFolderIds().includes(destination)
    };
    if (context.kind !== 'cv') return [paste];
    const disabled = this.deletingIds().includes(context.cv.id) || this.reorderDisabled();
    const href = this.location.prepareExternalUrl(this.router.serializeUrl(
      this.router.createUrlTree(['/create'], { queryParams: { id: context.cv.id } })
    ));
    return [
      { id: 'open', label: 'Open CV in new tab', icon: ExternalLink, href, newTab: true, disabled },
      { id: 'cut', label: 'Cut', icon: Scissors, disabled },
      paste
    ];
  });
  protected readonly FileIcon = FileText;
  protected readonly FolderIcon = Folder;
  protected readonly FolderOpenIcon = FolderOpen;
  protected readonly DeleteIcon = Trash2;
  protected readonly PreviewIcon = Eye;
  protected readonly DownloadIcon = Download;
  protected readonly pdf = inject(CvPdf);
  protected readonly previewCv = signal<SavedCv | null>(null);
  protected readonly drag = inject(CvDragStore);
  protected readonly dragType = CV_DRAG_TYPE;
  private readonly pointerDrag = inject(DragDrop);
  protected readonly dragSize = this.pointerDrag.size;
  private readonly collection = viewChild.required<ElementRef<HTMLElement>>('collection');
  private readonly insertionTargets = viewChildren(CvInsertionTarget);
  protected readonly canReorder = computed(() => {
    const id = this.drag.draggedId();
    return !this.reorderDisabled() && !!id && !this.deletingIds().includes(id) && this.cvs().some((cv) => cv.id === id);
  });
  private readonly selectedInsertion = linkedSignal<InsertionSource, CvInsertion | null>({
    source: () => {
      const target = this.insertionTargets().find((target) => target.hovered());
      return {
        item: this.pointerDrag.active(), allowed: this.canReorder(),
        target: target ? { targetId: target.cvInsertionTarget(), position: target.position() } : null,
        overCollection: this.pointerDrag.isOver(this.collection().nativeElement)
      };
    },
    computation: (source, previous) => {
      // Drop callbacks run after the shared drag session ends, so retain its last slot for that callback.
      if (!source.item) return previous?.value ?? null;
      if (!source.allowed) return null;
      if (source.target) return source.target;
      return source.overCollection && source.item === previous?.source.item ? previous.value : null;
    }
  });
  protected readonly insertion = computed(() => this.canReorder() ? this.selectedInsertion() : null);
  private readonly now = signal(Date.now());
  protected readonly updatedTimes = computed(() => {
    const now = this.now();
    return new Map(this.cvs().map((cv) => [cv.id, formatCompactRelativeTime(cv.updatedAt, now)]));
  });
  private readonly draft = inject(CvDraft);

  constructor() {
    effect((onCleanup) => {
      if (!this.isListView()) return;
      this.now.set(Date.now());
      const timer = setInterval(() => this.now.set(Date.now()), 1000);
      onCleanup(() => clearInterval(timer));
    });
  }

  protected openCv(): void { this.draft.reset(); }

  protected openCvMenu(event: MouseEvent, cv: SavedCv): void {
    this.menuContext.set({ kind: 'cv', cv });
    this.contextMenu().open(event);
  }

  protected openFolderMenu(event: MouseEvent, folder: CvFolder): void {
    this.menuContext.set({ kind: 'folder', folder });
    this.contextMenu().open(event);
  }

  openBackgroundMenu(event: MouseEvent): void {
    if (event.target instanceof Element && event.target.closest('a, button, input, select, textarea, [contenteditable="true"]')) return;
    this.menuContext.set({ kind: 'background' });
    this.contextMenu().open(event);
  }

  protected selectMenuItem(id: string): void {
    const context = this.menuContext();
    if (id === 'cut' && context.kind === 'cv') this.clipboard.cut(context.cv.id);
    if (id === 'paste' && this.clipboard.cutId()) {
      this.pasteRequested.emit(context.kind === 'folder' ? context.folder.id : this.folderId());
    }
  }

  protected dropOnFolder(item: DragItem, folderId: string): void {
    const cvId = this.drag.takeDrop(item);
    if (cvId) this.moved.emit({ cvId, folderId });
  }

  protected dropBetween(item: DragItem, targetId: string, position: CvReorder['position']): void {
    const cvId = this.drag.takeDrop(item);
    if (!cvId || cvId === targetId || this.reorderDisabled() ||
      this.deletingIds().includes(cvId) || this.deletingIds().includes(targetId) ||
      !this.cvs().some((cv) => cv.id === cvId)) return;
    this.reordered.emit({ cvId, targetId, position });
  }

  protected dropInCollection(item: DragItem): void {
    const insertion = this.selectedInsertion();
    if (insertion) this.dropBetween(item, insertion.targetId, insertion.position);
  }
}
