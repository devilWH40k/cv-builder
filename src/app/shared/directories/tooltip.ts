import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';

let nextTooltipId = 0;

@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'leave($event)',
    '(focus)': 'show()',
    '(blur)': 'blur($event)',
    '(click)': 'show()',
    '(keydown.escape)': 'dismiss($event)',
    '(window:resize)': 'hide()'
  }
})
export class Tooltip {
  readonly appTooltip = input.required<string>();
  readonly appTooltipLink = input('');
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly tooltip = this.document.createElement('span');
  private readonly link = this.document.createElement('a');

  constructor() {
    this.tooltip.id = `app-tooltip-${nextTooltipId++}`;
    this.tooltip.className = 'app-tooltip';
    this.tooltip.setAttribute('role', 'tooltip');
    this.tooltip.hidden = true;
    this.tooltip.addEventListener('mouseleave', this.leaveTooltip);
    this.tooltip.addEventListener('focusout', this.leaveFocus);
    this.tooltip.addEventListener('keydown', this.tooltipKeydown);
    this.link.textContent = 'more';
    this.link.addEventListener('click', this.followLink);

    effect(() => {
      const text = this.appTooltip();
      const destination = this.appTooltipLink();
      const hasLink = destination.startsWith('/') && !/^\/[/\\\s]/.test(destination)
        && !/[\\\s]/.test(destination);
      this.tooltip.textContent = text;
      // Linked help stays beside its control in the DOM so Tab reaches the link next.
      // A note can contain an interactive link; the plain hint keeps tooltip semantics.
      this.tooltip.setAttribute('role', hasLink ? 'note' : 'tooltip');
      if (hasLink) {
        this.link.setAttribute('href', destination);
        this.link.setAttribute('aria-label', `Read more: ${text}`);
        this.tooltip.append(' ', this.link);
      }
      if (text.trim()) {
        if (hasLink) this.host.after(this.tooltip);
        else if (this.tooltip.parentElement !== this.document.body) this.document.body.append(this.tooltip);
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
      this.tooltip.removeEventListener('focusout', this.leaveFocus);
      this.tooltip.removeEventListener('keydown', this.tooltipKeydown);
      this.link.removeEventListener('click', this.followLink);
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
    if (this.inside(event.relatedTarget) || this.hasFocus()) return;
    this.hide();
  }

  protected blur(event: FocusEvent): void {
    if (!this.inside(event.relatedTarget)) this.hide();
  }

  protected dismiss(event: Event): void {
    if (this.tooltip.hidden) return;
    event.stopPropagation();
    this.hide();
  }

  private readonly onScroll = () => {
    if (this.hasFocus()) this.position();
    else this.hide();
  };
  private readonly leaveTooltip = (event: MouseEvent) => {
    if (event.relatedTarget !== this.host && !this.hasFocus()) this.hide();
  };
  private readonly leaveFocus = (event: FocusEvent) => {
    if (event.relatedTarget !== this.host && !this.inside(event.relatedTarget)) this.hide();
  };
  private readonly tooltipKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    this.host.focus({ preventScroll: true });
    this.dismiss(event);
  };
  private readonly followLink = (event: MouseEvent) => {
    if (!this.router || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    this.hide();
    void this.router.navigateByUrl(this.appTooltipLink());
  };

  private inside(target: EventTarget | null): boolean {
    return target instanceof Node && this.tooltip.contains(target);
  }

  private hasFocus(): boolean {
    return this.document.activeElement === this.host || this.inside(this.document.activeElement);
  }

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
