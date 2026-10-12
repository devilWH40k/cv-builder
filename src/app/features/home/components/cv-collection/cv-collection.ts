import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileText, Folder, LucideAngularModule, Trash2 } from 'lucide-angular';
import { CvFolder } from '../../../cv/interfaces/cv-folder';
import { CvDraft } from '../../../cv/services/cv-draft';
import { SavedCv } from '../../../cv/services/saved-cvs';
import { CvDragStore, CV_DRAG_TYPE } from '../../state/cv-drag-store';
import { Draggable } from '../../../../shared/ui/draggable/draggable';
import { DropTarget } from '../../../../shared/ui/draggable/drop-target';
import { DragItem } from '../../../../shared/ui/draggable/drag-drop';
import { formatCompactRelativeTime } from '../../../../shared/utils/compact-relative-time';

export interface CvMove {
  readonly cvId: string;
  readonly folderId: string | null;
}

@Component({
  selector: 'app-cv-collection',
  imports: [RouterLink, LucideAngularModule, Draggable, DropTarget, DatePipe],
  templateUrl: './cv-collection.html',
  styleUrl: './cv-collection.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CvCollection {
  readonly cvs = input.required<readonly SavedCv[]>();
  readonly folders = input<readonly CvFolder[]>([]);
  readonly isListView = input(false);
  readonly deletingIds = input<readonly string[]>([]);
  readonly deletingFolderIds = input<readonly string[]>([]);
  readonly folderOpened = output<string>();
  readonly folderDeleted = output<string>();
  readonly cvDeleted = output<string>();
  readonly moved = output<CvMove>();
  protected readonly FileIcon = FileText;
  protected readonly FolderIcon = Folder;
  protected readonly DeleteIcon = Trash2;
  protected readonly drag = inject(CvDragStore);
  protected readonly dragType = CV_DRAG_TYPE;
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
}
