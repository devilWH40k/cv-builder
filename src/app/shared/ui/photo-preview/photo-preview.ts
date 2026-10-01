import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef,
  inject, input, output, signal, viewChild
} from '@angular/core';
import { Button } from '../button/button';
import { DialogOverlay } from '../dialog/dialog-overlay';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-photo-preview',
  imports: [Button, DialogOverlay],
  templateUrl: './photo-preview.html',
  styleUrl: './photo-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhotoPreview {
  readonly file = input.required<File>();
  readonly applied = output<File>();
  readonly cancelled = output<void>();
  protected readonly source = signal('');
  protected readonly dimensions = signal({ width: 1, height: 1 });
  protected readonly crop = signal({ x: 0, y: 0, size: 1 });
  protected readonly ready = signal(false);
  protected readonly saving = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly maximumSize = computed(() => Math.min(this.dimensions().width, this.dimensions().height));
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly overlay = viewChild.required(DialogOverlay);
  private readonly image = viewChild.required<ElementRef<HTMLImageElement>>('image');
  private readonly destroyRef = inject(DestroyRef);
  private readonly toasts = inject(ToastService);
  private drag: { id: number; x: number; y: number; cropX: number; cropY: number } | null = null;

  constructor() {
    afterNextRender(() => {
      const url = URL.createObjectURL(this.file());
      this.source.set(url);
      this.overlay().open();
      this.destroyRef.onDestroy(() => URL.revokeObjectURL(url));
    });
  }

  protected loaded(): void {
    const image = this.image().nativeElement;
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const size = Math.min(width, height) * 0.8;
    this.dimensions.set({ width, height });
    this.crop.set({ x: (width - size) / 2, y: (height - size) / 2, size });
    this.loadFailed.set(false);
    this.ready.set(true);
  }

  protected failed(): void {
    this.ready.set(false);
    this.loadFailed.set(true);
    this.toasts.show('danger', 'This photo could not be opened. Cancel and choose another JPG or PNG.');
  }

  protected startDrag(event: PointerEvent): void {
    if (event.button !== 0 || this.saving()) return;
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    target.focus();
    target.setPointerCapture(event.pointerId);
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, cropX: this.crop().x, cropY: this.crop().y };
    event.preventDefault();
  }

  protected moveDrag(event: PointerEvent): void {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    const bounds = this.image().nativeElement.getBoundingClientRect();
    this.move(
      this.drag.cropX + (event.clientX - this.drag.x) * this.dimensions().width / bounds.width,
      this.drag.cropY + (event.clientY - this.drag.y) * this.dimensions().height / bounds.height
    );
  }

  protected stopDrag(): void { this.drag = null; }

  protected moveWithKeyboard(event: KeyboardEvent): void {
    const step = this.maximumSize() * (event.shiftKey ? 0.1 : 0.01);
    const { x, y } = this.crop();
    switch (event.key) {
      case 'ArrowLeft': this.move(x - step, y); break;
      case 'ArrowRight': this.move(x + step, y); break;
      case 'ArrowUp': this.move(x, y - step); break;
      case 'ArrowDown': this.move(x, y + step); break;
      default: return;
    }
    event.preventDefault();
  }

  protected resize(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const previous = this.crop();
    const size = this.maximumSize() * Number(event.target.value) / 100;
    this.crop.set({ ...previous, size });
    this.move(previous.x + (previous.size - size) / 2, previous.y + (previous.size - size) / 2);
  }

  private move(x: number, y: number): void {
    const size = this.crop().size;
    const { width, height } = this.dimensions();
    this.crop.set({ size, x: Math.max(0, Math.min(width - size, x)), y: Math.max(0, Math.min(height - size, y)) });
  }

  protected cancel(): void {
    this.overlay().close();
    this.cancelled.emit();
  }

  protected async apply(): Promise<void> {
    if (!this.ready() || this.saving()) return;

    this.saving.set(true);

    try {
      const { x, y, size } = this.crop();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = Math.max(1, Math.min(1024, Math.round(size)));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.drawImage(this.image().nativeElement, x, y, size, size, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (this.destroyRef.destroyed) return;
      if (!blob) throw new Error('Photo export failed');
      const file = new File([blob], this.file().name.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' });
      this.overlay().close();
      this.applied.emit(file);
    } catch {
      if (!this.destroyRef.destroyed && this.dialog().nativeElement.open) {
        this.toasts.show('danger', 'The crop could not be applied. Please try again.');
      }
    } finally {
      if (!this.destroyRef.destroyed) this.saving.set(false);
    }
  }
}
