import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, Subject } from 'rxjs';

/** Preview after a pause; commit before an outside click changes the active canvas object. */
@Directive({
  selector: 'input[type=color][appDebouncedColor]',
  host: { '(input)': 'queue()', '(blur)': 'flush()' },
})
export class DebouncedColor {
  readonly colorCommitted = output<string>();
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly updates = new Subject<void>();
  private pending: string | null = null;

  constructor() {
    this.updates.pipe(debounceTime(150), takeUntilDestroyed()).subscribe(() => this.flush());
    this.document.addEventListener('pointerdown', this.outsidePointer, true);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('pointerdown', this.outsidePointer, true);
      this.updates.complete();
      this.pending = null;
    });
  }

  protected queue(): void {
    this.pending = this.input.value;
    this.updates.next();
  }

  protected flush(): void {
    if (this.pending === null) return;
    const color = this.pending;
    this.pending = null;
    this.colorCommitted.emit(color);
  }

  private readonly outsidePointer = (event: PointerEvent): void => {
    if (event.target !== this.input) this.flush();
  };
}
