import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

export interface DragItem {
  readonly type: string;
  readonly id: string;
}

export interface DropZone {
  readonly element: HTMLElement;
  readonly accepts: (item: DragItem) => boolean;
  readonly dropped: (item: DragItem) => void;
  readonly includeChildren?: boolean;
}

interface PointerDrag {
  readonly pointerId: number;
  readonly source: HTMLElement;
  readonly item: DragItem;
  readonly startX: number;
  readonly startY: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

@Injectable({ providedIn: 'root' })
export class DragDrop {
  private readonly document = inject(DOCUMENT);
  private readonly session = signal<PointerDrag | null>(null);
  readonly active = computed(() => this.session()?.item ?? null);
  private readonly over = signal<HTMLElement | null>(null);
  private readonly zones = new Set<DropZone>();
  private candidate: PointerDrag | null = null;
  private preview: HTMLElement | null = null;
  private clickTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() { inject(DestroyRef).onDestroy(() => { this.cancel(); this.clearClickGuard(); }); }

  register(zone: DropZone): () => void {
    this.zones.add(zone);
    return () => {
      this.zones.delete(zone);
      if (this.over() === zone.element) this.over.set(null);
    };
  }

  isDragging(element: HTMLElement): boolean { return this.session()?.source === element; }
  isOver(element: HTMLElement): boolean { return this.over() === element; }

  prepare(event: PointerEvent, source: HTMLElement, item: DragItem): void {
    if (event.button !== 0 || this.candidate || this.session()) return;
    const rect = source.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.candidate = {
      source, item, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top
    };
    this.document.addEventListener('pointermove', this.move, { passive: false });
    this.document.addEventListener('pointerup', this.release);
    this.document.addEventListener('pointercancel', this.pointerCancel);
    this.document.addEventListener('keydown', this.keydown, true);
    this.document.defaultView?.addEventListener('blur', this.cancelOnBlur);
  }

  cancelFor(element: HTMLElement): void {
    if ((this.session() ?? this.candidate)?.source === element) this.cancel();
  }

  cancel(): void {
    const wasDragging = !!this.session();
    this.document.removeEventListener('pointermove', this.move);
    this.document.removeEventListener('pointerup', this.release);
    this.document.removeEventListener('pointercancel', this.pointerCancel);
    this.document.removeEventListener('keydown', this.keydown, true);
    this.document.defaultView?.removeEventListener('blur', this.cancelOnBlur);
    this.preview?.remove();
    this.preview = null;
    this.candidate = null;
    this.session.set(null);
    this.over.set(null);
    this.document.body.classList.remove('app-dragging');
    if (wasDragging) this.clickTimer = setTimeout(() => this.clearClickGuard(), 0);
  }

  private readonly move = (event: PointerEvent) => {
    const drag = this.session() ?? this.candidate;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!this.session()) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
      this.preview = this.createPreview(drag.source);
      this.clearClickGuard();
      this.document.addEventListener('click', this.suppressClick, true);
      this.document.body.classList.add('app-dragging');
      this.session.set(drag);
      this.candidate = null;
    }
    event.preventDefault();
    this.preview!.style.transform = `translate3d(${event.clientX - drag.offsetX}px, ${event.clientY - drag.offsetY}px, 0)`;
    this.over.set(this.zoneAt(event.clientX, event.clientY, drag.item)?.element ?? null);
  };

  private readonly release = (event: PointerEvent) => {
    const drag = this.session() ?? this.candidate;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const zone = this.session() ? this.zoneAt(event.clientX, event.clientY, drag.item) : null;
    if (this.session()) event.preventDefault();
    this.cancel();
    zone?.dropped(drag.item);
  };

  private readonly pointerCancel = (event: PointerEvent) => {
    if ((this.session() ?? this.candidate)?.pointerId === event.pointerId) this.cancel();
  };
  private readonly cancelOnBlur = () => this.cancel();
  private readonly keydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !this.session()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.cancel();
  };
  private readonly suppressClick = (event: MouseEvent) => { event.preventDefault(); event.stopImmediatePropagation(); };
  private clearClickGuard(): void {
    if (this.clickTimer !== null) clearTimeout(this.clickTimer);
    this.clickTimer = null;
    this.document.removeEventListener('click', this.suppressClick, true);
  }

  private zoneAt(x: number, y: number, item: DragItem): DropZone | null {
    const hit = this.document.elementFromPoint(x, y);
    for (let element = hit; element; element = element.parentElement) {
      for (const zone of this.zones) {
        if (zone.element === element && (zone.includeChildren !== false || hit === element) && zone.accepts(item)) return zone;
      }
    }
    return null;
  }

  private createPreview(source: HTMLElement): HTMLElement {
    const rect = source.getBoundingClientRect();
    const clone = source.cloneNode(true);
    if (!(clone instanceof HTMLElement)) throw new Error('A draggable preview requires an HTML element.');
    const originals = [source, ...Array.from(source.querySelectorAll('*'))];
    const copies = [clone, ...Array.from(clone.querySelectorAll('*'))];
    // Preserve inherited and ancestor-dependent styles when the preview moves to the body.
    originals.forEach((original, index) => {
      const copy = copies[index];
      if (!(copy instanceof HTMLElement || copy instanceof SVGElement)) return;
      const styles = getComputedStyle(original);
      for (const property of Array.from(styles)) copy.style.setProperty(property, styles.getPropertyValue(property));
      copy.style.pointerEvents = 'none';
      copy.removeAttribute('id');
    });
    Object.assign(clone.style, {
      position: 'relative', inset: 'auto', margin: '0', width: '100%', height: '100%',
      maxWidth: 'none', maxHeight: 'none', transform: 'none'
    });
    const preview = this.document.createElement('div');
    preview.className = 'app-drag-preview';
    preview.setAttribute('aria-hidden', 'true');
    preview.inert = true;
    preview.style.width = `${rect.width}px`;
    preview.style.height = `${rect.height}px`;
    preview.append(clone);
    this.document.body.append(preview);
    return preview;
  }
}
