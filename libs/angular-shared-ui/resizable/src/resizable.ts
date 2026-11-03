import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';
import { LucideAngularModule, Maximize2 } from 'lucide-angular';

interface ResizeDrag {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly scale: number;
}

/** A square content wrapper. Sizes and keyboard steps are in unscaled CSS pixels. */
@Component({
  selector: 'app-resizable',
  imports: [LucideAngularModule],
  templateUrl: './resizable.html',
  styleUrl: './resizable.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'role': 'slider',
    'tabindex': '0',
    '[attr.aria-label]': 'label()',
    '[attr.aria-valuemin]': 'minSize()',
    '[attr.aria-valuemax]': 'maxSize()',
    '[attr.aria-valuenow]': 'boundedSize()',
    '[attr.aria-valuetext]': 'valueText() || boundedSize() + " pixels"',
    '[style.width.px]': 'boundedSize()',
    '[style.height.px]': 'boundedSize()',
    '[class.resizing]': 'resizing()',
    '(pointerdown)': 'startResize($event)',
    '(pointermove)': 'resize($event)',
    '(pointerup)': 'finishResize($event)',
    '(pointercancel)': 'cancelResize($event)',
    '(lostpointercapture)': 'lostCapture($event)',
    '(keydown)': 'onKeydown($event)',
    '(dragstart)': '$event.preventDefault()'
  }
})
export class Resizable {
  readonly size = input.required<number>();
  readonly minSize = input.required<number>();
  readonly maxSize = input.required<number>();
  readonly label = input('Resize');
  readonly valueText = input('');
  readonly step = input(1);
  readonly sizeChange = output<number>();
  protected readonly ResizeIcon = Maximize2;
  protected readonly resizing = signal(false);
  protected readonly boundedSize = computed(() => this.clamp(this.size()));
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private drag: ResizeDrag | null = null;

  protected startResize(event: PointerEvent): void {
    if (event.button !== 0 || this.drag) return;
    const host = this.element.nativeElement;
    const size = this.boundedSize();
    const scale = host.getBoundingClientRect().width / size;
    if (scale <= 0) return;
    event.preventDefault();
    host.focus({ preventScroll: true });
    host.setPointerCapture(event.pointerId);
    this.drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, size, scale };
    this.resizing.set(true);
  }

  protected resize(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    // Project movement onto the square's diagonal, accounting for CSS zoom/transforms.
    const delta = (event.clientX - drag.x + event.clientY - drag.y) / (2 * drag.scale);
    this.sizeChange.emit(this.clamp(drag.size + delta));
  }

  protected finishResize(event: PointerEvent): void {
    if (this.drag?.pointerId !== event.pointerId) return;
    this.resize(event);
    this.endResize();
  }

  protected cancelResize(event: PointerEvent): void {
    if (this.drag?.pointerId !== event.pointerId) return;
    this.sizeChange.emit(this.drag.size);
    this.endResize();
  }

  protected lostCapture(event: PointerEvent): void {
    if (this.drag?.pointerId !== event.pointerId) return;
    this.drag = null;
    this.resizing.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.drag) {
      event.preventDefault();
      this.sizeChange.emit(this.drag.size);
      this.endResize();
      return;
    }
    if (this.drag) return;
    let size = this.boundedSize();
    switch (event.key) {
      case 'ArrowRight': case 'ArrowUp': size += this.step(); break;
      case 'ArrowLeft': case 'ArrowDown': size -= this.step(); break;
      case 'Home': size = this.minSize(); break;
      case 'End': size = this.maxSize(); break;
      default: return;
    }
    event.preventDefault();
    this.sizeChange.emit(this.clamp(size));
  }

  private endResize(): void {
    const pointerId = this.drag?.pointerId;
    this.drag = null;
    this.resizing.set(false);
    const host = this.element.nativeElement;
    if (pointerId !== undefined && host.hasPointerCapture(pointerId)) host.releasePointerCapture(pointerId);
  }

  private clamp(size: number): number {
    return Math.min(this.maxSize(), Math.max(this.minSize(), Number.isFinite(size) ? size : this.minSize()));
  }
}
