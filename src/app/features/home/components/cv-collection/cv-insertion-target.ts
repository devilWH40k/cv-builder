import { computed, Directive, ElementRef, inject, input } from '@angular/core';
import { DragDrop } from '../../../../shared/ui/draggable/drag-drop';
import { CvReorder } from '../../../cv/interfaces/cv-reorder';

export type CvInsertion = Pick<CvReorder, 'targetId' | 'position'>;

@Directive({ selector: '[cvInsertionTarget]' })
export class CvInsertionTarget {
  readonly cvInsertionTarget = input.required<string>();
  readonly position = input.required<CvReorder['position']>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly drag = inject(DragDrop);
  readonly hovered = computed(() => this.drag.isOver(this.element));
}
