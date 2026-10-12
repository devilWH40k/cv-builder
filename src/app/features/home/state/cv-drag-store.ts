import { computed, inject, Injectable } from '@angular/core';
import { DragDrop, DragItem } from '../../../shared/ui/draggable/drag-drop';

export const CV_DRAG_TYPE = 'application/x-cv-builder-cv';

@Injectable({ providedIn: 'root' })
export class CvDragStore {
  private readonly drag = inject(DragDrop);
  readonly draggedId = computed(() => {
    const item = this.drag.active();
    return item?.type === CV_DRAG_TYPE ? item.id : null;
  });

  takeDrop(item: DragItem): string | null { return item.type === CV_DRAG_TYPE ? item.id : null; }
  end(): void { this.drag.cancel(); }
}
