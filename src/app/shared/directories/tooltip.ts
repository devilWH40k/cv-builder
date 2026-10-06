import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, effect, inject, input } from '@angular/core';

let nextTooltipId = 0;

@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'leave($event)',
    '(focus)': 'show()',
    '(blur)': 'hide()',
    '(click)': 'show()',
    '(keydown.escape)': 'dismiss($event)',
    '(window:resize)': 'hide()'
  }
})
export class Tooltip {
  readonly appTooltip = input.required<string>();
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly tooltip = this.document.createElement('span');

  constructor() {
    this.tooltip.id = `app-tooltip-${nextTooltipId++}`;
    this.tooltip.className = 'app-tooltip';
    this.tooltip.setAttribute('role', 'tooltip');
    this.tooltip.hidden = true;
    this.tooltip.addEventListener('mouseleave', this.leaveTooltip);

    effect(() => {
      const text = this.appTooltip();
      this.tooltip.textContent = text;
      if (text.trim()) {
        if (!this.tooltip.isConnected) this.document.body.append(this.tooltip);
        this.describe(true);
        if (!this.tooltip.hidden) this.position();
      } else {
        this.hide();
        this.describe(false);
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.hide();
      this.describe(false);
      this.tooltip.removeEventListener('mouseleave', this.leaveTooltip);
      this.tooltip.remove();
    });
  }

  protected show(): void {
    if (!this.appTooltip().trim()) return;
    this.tooltip.hidden = false;
    this.position();
    this.document.addEventListener('scroll', this.onScroll, true);
  }

  protected hide(): void {
    this.tooltip.hidden = true;
    this.document.removeEventListener('scroll', this.onScroll, true);
  }

  protected leave(event: MouseEvent): void {
    if (event.relatedTarget === this.tooltip || this.document.activeElement === this.host) return;
    this.hide();
  }

  protected dismiss(event: Event): void {
    if (this.tooltip.hidden) return;
    event.stopPropagation();
    this.hide();
  }

  private readonly onScroll = () => {
    if (this.document.activeElement === this.host) this.position();
    else this.hide();
  };
  private readonly leaveTooltip = () => {
    if (this.document.activeElement !== this.host) this.hide();
  };

  private describe(include: boolean): void {
    const ids = (this.host.getAttribute('aria-describedby') ?? '').split(/\s+/)
      .filter((id) => id && id !== this.tooltip.id);
    if (include) ids.push(this.tooltip.id);
    if (ids.length) this.host.setAttribute('aria-describedby', ids.join(' '));
    else this.host.removeAttribute('aria-describedby');
  }

  private position(): void {
    const anchor = this.host.getBoundingClientRect();
    const bounds = this.tooltip.getBoundingClientRect();
    const viewport = this.document.documentElement;
    const left = Math.max(0, Math.min(anchor.left, viewport.clientWidth - bounds.width));
    const top = anchor.bottom + bounds.height <= viewport.clientHeight
      ? anchor.bottom : Math.max(0, anchor.top - bounds.height);
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }
}
