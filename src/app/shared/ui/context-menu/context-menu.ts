import { DOCUMENT } from '@angular/common';
import { afterRenderEffect, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';

export interface ContextMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: LucideIconData;
  readonly disabled?: boolean;
  readonly href?: string;
  readonly newTab?: boolean;
  readonly separatorBefore?: boolean;
}

@Component({
  selector: 'app-context-menu',
  imports: [LucideAngularModule],
  templateUrl: './context-menu.html',
  styleUrl: './context-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContextMenu {
  readonly items = input.required<readonly ContextMenuItem[]>();
  readonly label = input('Context menu');
  readonly selected = output<string>();
  protected readonly position = signal<{ x: number; y: number } | null>(null);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly document = inject(DOCUMENT);
  private anchor: Comment | null = null;
  private returnFocus: HTMLElement | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.close(false);
      this.panel()?.nativeElement.remove();
    });
    afterRenderEffect(() => {
      this.items();
      const position = this.position();
      const panel = this.panel()?.nativeElement;
      if (!position || !panel) return;
      panel.hidden = false;
      if (!this.anchor) {
        this.anchor = this.document.createComment('context menu outlet');
        panel.before(this.anchor);
        this.document.body.append(panel);
        this.document.addEventListener('pointerdown', this.outside, true);
        this.document.addEventListener('contextmenu', this.outside, true);
        this.document.addEventListener('focusin', this.outside, true);
        this.document.addEventListener('keydown', this.keydown, true);
        this.document.addEventListener('scroll', this.scrolled, true);
        this.document.defaultView?.addEventListener('resize', this.resized);
      }
      const bounds = panel.getBoundingClientRect();
      const viewport = this.document.documentElement;
      panel.style.left = `${Math.max(0, Math.min(position.x, viewport.clientWidth - bounds.width))}px`;
      panel.style.top = `${Math.max(0, Math.min(position.y, viewport.clientHeight - bounds.height))}px`;
      (this.controls()[0] ?? panel).focus({ preventScroll: true });
    });
  }

  open(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('a[href], button, [tabindex]') : null;
    this.returnFocus = target ?? (this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null);
    const bounds = this.returnFocus?.getBoundingClientRect();
    const keyboard = event.clientX === 0 && event.clientY === 0;
    this.position.set({
      x: keyboard ? bounds?.left ?? 0 : event.clientX,
      y: keyboard ? bounds?.bottom ?? 0 : event.clientY
    });
  }

  close(restoreFocus = true): void {
    this.document.removeEventListener('focusin', this.outside, true);
    const panel = this.panel()?.nativeElement;
    if (panel) panel.hidden = true;
    if (panel && this.anchor) this.anchor.replaceWith(panel);
    this.anchor = null;
    this.position.set(null);
    this.document.removeEventListener('pointerdown', this.outside, true);
    this.document.removeEventListener('contextmenu', this.outside, true);
    this.document.removeEventListener('keydown', this.keydown, true);
    this.document.removeEventListener('scroll', this.scrolled, true);
    this.document.defaultView?.removeEventListener('resize', this.resized);
    if (restoreFocus && this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
  }

  protected choose(item: ContextMenuItem): void {
    if (item.disabled) return;
    this.close();
    this.selected.emit(item.id);
  }

  private controls(): HTMLElement[] {
    return Array.from(this.panel()?.nativeElement.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
  }

  private readonly outside = (event: Event) => {
    if (!(event.target instanceof Node) || !this.panel()?.nativeElement.contains(event.target)) this.close(false);
  };
  private readonly resized = () => this.close(false);
  private readonly scrolled = (event: Event) => {
    if (!(event.target instanceof Node) || !this.panel()?.nativeElement.contains(event.target)) this.close(false);
  };
  private readonly keydown = (event: KeyboardEvent) => {
    if (event.key === 'Tab') { this.close(); return; }
    if (!['Escape', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === 'Escape') { this.close(); return; }
    const controls = this.controls();
    const index = controls.findIndex((control) => control === this.document.activeElement);
    if (event.key === 'Enter' || event.key === ' ') { controls[index]?.click(); return; }
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1
      : event.key === 'ArrowDown' ? (index + 1) % controls.length
        : index <= 0 ? controls.length - 1 : index - 1;
    controls[next]?.focus();
  };
}
