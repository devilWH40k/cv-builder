import { afterRenderEffect, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import { SavedCv } from '../../../cv/services/saved-cvs';
import { CvInsertion } from './cv-insertion-target';

/** Animates card contents while keeping insertion hit areas at their actual layout positions. */
@Directive({ selector: '[cvCollectionMotion]' })
export class CvCollectionMotion {
  readonly cvCollectionMotion = input.required<readonly SavedCv[]>();
  readonly motionInsertion = input<CvInsertion | null>(null);
  readonly motionDragging = input(false);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private positions = new Map<HTMLElement, { left: number; top: number }>();
  private readonly animations = new Map<HTMLElement, Animation>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancelAnimations());
    afterRenderEffect(() => {
      this.cvCollectionMotion();
      this.motionInsertion();
      this.motionDragging();
      const cards = Array.from(this.element.querySelectorAll<HTMLElement>('.cv-card, .cv-actions'))
        .filter((card) => card.getClientRects().length > 0);
      const offsets = new Map(cards.map((card) => {
        const translate = this.animations.has(card) ? getComputedStyle(card).translate : '';
        const [x, y] = translate.split(' ').map((part) => parseFloat(part) || 0);
        return [card, { x: x ?? 0, y: y ?? 0 }] as const;
      }));
      this.cancelAnimations();
      const bounds = this.element.getBoundingClientRect();
      const nextPositions = new Map(cards.map((card) => {
        const rect = card.getBoundingClientRect();
        return [card, { left: rect.left - bounds.left, top: rect.top - bounds.top }] as const;
      }));
      const duration = parseFloat(getComputedStyle(this.element).getPropertyValue('--cv-reorder-duration')) || 0;
      if (duration && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        for (const [card, next] of nextPositions) {
          const previous = this.positions.get(card);
          if (!previous) continue;
          const offset = offsets.get(card);
          const x = previous.left - next.left + (offset?.x ?? 0);
          const y = previous.top - next.top + (offset?.y ?? 0);
          if (Math.abs(x) < 1 && Math.abs(y) < 1) continue;
          const animation = card.animate([{ translate: `${x}px ${y}px` }, { translate: '0px 0px' }], {
            duration, easing: 'ease-out'
          });
          this.animations.set(card, animation);
          animation.onfinish = () => this.animations.delete(card);
        }
      }
      this.positions = nextPositions;
    });
  }

  private cancelAnimations(): void {
    for (const animation of this.animations.values()) {
      animation.onfinish = null;
      animation.cancel();
    }
    this.animations.clear();
  }
}
