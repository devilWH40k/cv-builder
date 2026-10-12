import { computed, DestroyRef, Directive, ElementRef, inject, input, output } from '@angular/core';
import { DragDrop, DragItem } from './drag-drop';

@Directive({
  selector: '[appDropTarget]',
  host: { '[class.drop-target]': 'hovered()' }
})
export class DropTarget {
  readonly appDropTarget = input.required<string>();
  readonly dropDisabled = input(false);
  readonly itemDropped = output<DragItem>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly drag = inject(DragDrop);
  protected readonly hovered = computed(() => this.drag.isOver(this.element));

  constructor() {
    const unregister = this.drag.register({
      element: this.element,
      accepts: (item) => !this.dropDisabled() && item.type === this.appDropTarget(),
      dropped: (item) => this.itemDropped.emit(item)
    });
    inject(DestroyRef).onDestroy(unregister);
  }
}
