import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { CvFolder } from '../../../cv/interfaces/cv-folder';
import { SavedCv } from '../../../cv/services/saved-cvs';
import { CvReorder } from '../../../cv/interfaces/cv-reorder';
import { CvDragStore, CV_DRAG_TYPE } from '../../state/cv-drag-store';
import { CvCollection, CvMove } from '../cv-collection/cv-collection';
import { DragItem } from '../../../../shared/ui/draggable/drag-drop';

@Component({
  selector: 'app-folder-dialog',
  imports: [Dialog, CvCollection],
  templateUrl: './folder-dialog.html',
  styleUrl: './folder-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FolderDialog {
  readonly folder = input.required<CvFolder>();
  readonly cvs = input.required<readonly SavedCv[]>();
  readonly isListView = input(false);
  readonly deletingIds = input<readonly string[]>([]);
  readonly reorderDisabled = input(false);
  readonly error = input('');
  readonly dismissed = output<void>();
  readonly cvDeleted = output<string>();
  readonly moved = output<CvMove>();
  readonly reordered = output<CvReorder>();
  protected readonly drag = inject(CvDragStore);
  protected readonly dragType = CV_DRAG_TYPE;

  protected dropOutside(item: DragItem): void {
    const cvId = this.drag.takeDrop(item);
    if (cvId && this.folder().cvIds.includes(cvId)) this.moved.emit({ cvId, folderId: null });
  }
}
