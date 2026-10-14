import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, effect, ElementRef, inject, input, output } from '@angular/core';
import { DragDrop, DragItem } from '../draggable/drag-drop';

/** Moves an Angular-owned dialog to the body without entering the browser top layer. */
@Directive({ selector: 'dialog[appDialogOverlay]' })
export class DialogOverlay {
  readonly backdropDropType = input('');
  readonly backdropDropped = output<DragItem>();
  private readonly drag = inject(DragDrop);
  private unregisterDrop: (() => void) | null = null;
  private readonly document = inject(DOCUMENT);
  private readonly dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;
  private layer: HTMLElement | null = null;
  private anchor: Comment | null = null;
  private previousFocus: HTMLElement | null = null;
  private inertElements: HTMLElement[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.close());
    effect(() => {
      const hovered = this.drag.isOver(this.layer ?? this.dialog);
      this.layer?.classList.toggle('drop-target', hovered);
    });
  }

  open(): void {
    if (this.layer) return;
    this.previousFocus = this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
    this.anchor = this.document.createComment('dialog outlet');
    this.dialog.before(this.anchor);
    this.layer = this.document.createElement('div');
    this.layer.className = 'dialog-overlay';
    this.document.body.append(this.layer);
    this.layer.append(this.dialog);
    this.dialog.setAttribute('aria-modal', 'true');
    this.dialog.tabIndex = -1;
    this.dialog.show();
    // Leave the global toast outlet interactive and available to assistive technology.
    const disable = (parent: Element) => {
      for (const child of Array.from(parent.children)) {
        if (!(child instanceof HTMLElement) || child === this.layer || child.matches('app-toasts') || child.inert) continue;
        if (child.querySelector('app-toasts')) disable(child);
        else { child.inert = true; this.inertElements.push(child); }
      }
    };
    disable(this.document.body);
    this.layer.addEventListener('click', this.backdrop);
    this.unregisterDrop = this.drag.register({
      element: this.layer,
      includeChildren: false,
      accepts: (item) => !!this.backdropDropType() && item.type === this.backdropDropType(),
      dropped: (item) => this.backdropDropped.emit(item)
    });
    this.document.addEventListener('keydown', this.keydown);
    this.dialog.addEventListener('close', this.closed);
    (this.dialog.querySelector<HTMLElement>('[autofocus], button:not(:disabled), input:not(:disabled)') ?? this.dialog).focus();
  }

  close(): void {
    if (!this.layer) return;
    this.unregisterDrop?.();
    this.unregisterDrop = null;
    this.dialog.removeEventListener('close', this.closed);
    this.document.removeEventListener('keydown', this.keydown);
    this.dialog.close();
    this.dialog.removeAttribute('aria-modal');
    this.anchor?.replaceWith(this.dialog);
    this.layer.remove();
    this.layer = null;
    this.anchor = null;
    for (const element of this.inertElements) element.inert = false;
    this.inertElements = [];
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
  }

  private readonly closed = () => this.close();
  private readonly backdrop = (event: MouseEvent) => {
    if (event.target === this.layer) this.cancel();
  };
  private cancel(): void {
    if (this.dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) this.close();
  }
  private readonly keydown = (event: KeyboardEvent) => {
    if (this.layer?.inert) return;
    if (event.key === 'Escape') { event.preventDefault(); this.cancel(); }
    if (event.key !== 'Tab') return;
    const elements = Array.from(this.dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.getClientRects().length > 0);
    const first = elements[0] ?? this.dialog;
    const last = elements.at(-1) ?? this.dialog;
    const active = this.document.activeElement;
    if (!this.dialog.contains(active) || (event.shiftKey ? active === first : active === last) || active === this.dialog) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  };
}
