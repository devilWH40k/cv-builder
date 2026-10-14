import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input } from '@angular/core';
import { DragDrop } from './drag-drop';

@Component({
  selector: 'app-draggable',
  template: '<ng-content />',
  styleUrl: './draggable.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.dragging]': 'dragging()',
    '(pointerdown)': 'prepare($event)',
    '(dragstart)': '$event.preventDefault()'
  }
})
export class Draggable {
  readonly dragId = input.required<string>();
  readonly dragType = input.required<string>();
  readonly disabled = input(false);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly drag = inject(DragDrop);
  protected readonly dragging = computed(() => this.drag.isDragging(this.element));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.drag.cancelFor(this.element));

    effect(() => {
      if (this.disabled()) this.drag.cancelFor(this.element);
    });
  }

  protected prepare(event: PointerEvent): void {
    if (
      this.disabled() ||
      event.target instanceof Element &&
      event.target.closest('button, input, select, textarea, [contenteditable="true"], [data-no-drag]')) return;
    this.drag.prepare(event, this.element, { type: this.dragType(), id: this.dragId() });
  }
}
