import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, linkedSignal, output, signal, viewChild, viewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Download, Eye, FileText, Folder, LucideAngularModule, Trash2 } from 'lucide-angular';
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

@Component({
  selector: 'app-cv-collection',
  imports: [RouterLink, LucideAngularModule, Draggable, DropTarget, CvInsertionTarget, CvCollectionMotion, DatePipe, CvPreviewDialog],
  templateUrl: './cv-collection.html',
  styleUrls: ['./cv-collection.scss', './cv-collection-order.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CvCollection {
  readonly cvs = input.required<readonly SavedCv[]>();
  readonly folders = input<readonly CvFolder[]>([]);
  readonly isListView = input(false);
  readonly deletingIds = input<readonly string[]>([]);
  readonly deletingFolderIds = input<readonly string[]>([]);
  readonly reorderDisabled = input(false);
  readonly folderOpened = output<string>();
  readonly folderDeleted = output<string>();
  readonly cvDeleted = output<string>();
  readonly moved = output<CvMove>();
  readonly reordered = output<CvReorder>();
  protected readonly FileIcon = FileText;
  protected readonly FolderIcon = Folder;
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
