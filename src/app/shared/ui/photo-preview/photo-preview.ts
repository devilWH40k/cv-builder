import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef,
  inject, input, output, signal, viewChild
} from '@angular/core';
import { Button } from '../button/button';
import { DialogOverlay } from '../dialog/dialog-overlay';
import { ToastService } from '../toast/toast.service';
import { Spinner } from '../spinner/spinner';

export type PhotoCropShape = 'circle' | 'rectangle' | 'full';

@Component({
  selector: 'app-photo-preview',
  imports: [Button, DialogOverlay, Spinner],
  templateUrl: './photo-preview.html',
  styleUrl: './photo-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhotoPreview {
  readonly file = input.required<File>();
  readonly shapes = input<readonly PhotoCropShape[]>(['circle']);
  // CV portraits already apply their own circular mask when rendering.
  readonly circularOutput = input(false);
  readonly applied = output<File>();
  readonly cancelled = output<void>();
  protected readonly source = signal('');
  protected readonly dimensions = signal({ width: 1, height: 1 });
  protected readonly shape = signal<PhotoCropShape>('circle');
  protected readonly crop = signal({ x: 0, y: 0, width: 1, height: 1 });
  protected readonly frame = computed(() => this.shape() === 'full'
    ? { x: 0, y: 0, ...this.dimensions() } : this.crop());
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
      this.shape.set(this.shapes()[0] ?? 'circle');
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
    this.dimensions.set({ width, height });
    this.chooseShape(this.shape());
    this.loadFailed.set(false);
    this.ready.set(true);
  }

  protected chooseShape(shape: PhotoCropShape): void {
    this.stopDrag();
    this.shape.set(shape);
    const dimensions = this.dimensions();
    const width = (shape === 'rectangle' ? dimensions.width : this.maximumSize()) * 0.8;
    const height = (shape === 'rectangle' ? dimensions.height : this.maximumSize()) * 0.8;
    this.crop.set({ x: (dimensions.width - width) / 2, y: (dimensions.height - height) / 2, width, height });
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

  protected resize(event: Event, axis: 'width' | 'height' = 'width'): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const previous = this.crop();
    const maximum = this.shape() === 'circle' ? this.maximumSize() : this.dimensions()[axis];
    const size = maximum * Number(event.target.value) / 100;
    const next = this.shape() === 'circle' ? { width: size, height: size } : { [axis]: size };
    this.crop.set({ ...previous, ...next });
    this.move(previous.x + (previous.width - this.crop().width) / 2,
      previous.y + (previous.height - this.crop().height) / 2);
  }

  private move(x: number, y: number): void {
    const crop = this.crop();
    const { width, height } = this.dimensions();
    this.crop.set({ ...crop, x: Math.max(0, Math.min(width - crop.width, x)), y: Math.max(0, Math.min(height - crop.height, y)) });
  }

  protected cancel(): void {
    this.overlay().close();
    this.cancelled.emit();
  }

  protected async apply(): Promise<void> {
    if (!this.ready() || this.saving()) return;

    this.saving.set(true);

    try {
      if (this.shape() === 'full') {
        this.overlay().close();
        this.applied.emit(this.file());
        return;
      }
      const { x, y, width, height } = this.crop();
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1024 / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      if (this.shape() === 'circle' && this.circularOutput()) {
        context.beginPath();
        context.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
        context.clip();
      }
      context.drawImage(this.image().nativeElement, x, y, width, height, 0, 0, canvas.width, canvas.height);
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
