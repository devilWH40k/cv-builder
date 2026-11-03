import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/** Accessible panel resizing; the parent owns layout and size. */
@Component({
  selector: 'app-resize-handle',
  templateUrl: './resize-handle.html',
  styleUrl: './resize-handle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.vertical]': "axis() === 'vertical'" },
})
export class ResizeHandle {
  readonly size = model(280);
  readonly axis = input<'horizontal' | 'vertical'>('horizontal');
  readonly min = input(200);
  readonly max = input(420);
  readonly edge = input<'left' | 'right'>('right');
  readonly label = input.required<string>();
  private drag: { pointerId: number; x: number; size: number } | null = null;

  protected start(event: PointerEvent): void {
    if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    this.drag = { pointerId: event.pointerId, x: this.coordinate(event), size: this.size() };
  }

  protected move(event: PointerEvent): void {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    this.resize(this.drag.size + (this.coordinate(event) - this.drag.x) * this.direction());
  }

  protected stop(): void { this.drag = null; }

  protected keyboard(event: KeyboardEvent): void {
    const decrease = this.axis() === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    const increase = this.axis() === 'vertical' ? 'ArrowDown' : 'ArrowRight';
    if (![decrease, increase, 'Home', 'End', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      if (this.drag) this.resize(this.drag.size);
      this.stop();
    } else if (event.key === 'Home') this.resize(this.min());
    else if (event.key === 'End') this.resize(this.max());
    else this.resize(this.size() + (event.key === increase ? 1 : -1) * this.direction() * (event.shiftKey ? 40 : 10));
  }

  private direction(): number { return this.edge() === 'right' ? 1 : -1; }
  private coordinate(event: PointerEvent): number { return this.axis() === 'vertical' ? event.clientY : event.clientX; }
  private resize(size: number): void {
    this.size.set(Math.max(this.min(), Math.min(this.max(), size)));
  }
}
