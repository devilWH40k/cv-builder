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
      const bounds = this.element.getBoundingClientRect();
      const measurements = new Map(cards.map((card) => {
        const rect = card.getBoundingClientRect();
        const offset = offsets.get(card)!;
        return [card, { left: rect.left - offset.x, top: rect.top - offset.y, width: rect.width, height: rect.height }] as const;
      }));
      const nextPositions = new Map(Array.from(measurements, ([card, rect]) =>
        [card, { left: rect.left - bounds.left, top: rect.top - bounds.top }] as const));
      const duration = parseFloat(getComputedStyle(this.element).getPropertyValue('--cv-reorder-duration')) || 0;
      const motionAllowed = duration > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      for (const card of this.animations.keys()) {
        if (!nextPositions.has(card) || !motionAllowed) this.cancelAnimation(card);
      }
      if (motionAllowed) {
        for (const [card, next] of nextPositions) {
          const previous = this.positions.get(card);
          if (!previous) continue;
          // An unchanged destination must not restart an animation already in progress.
          if (Math.abs(previous.left - next.left) < 1 && Math.abs(previous.top - next.top) < 1) continue;
          const offset = offsets.get(card);
          const x = previous.left - next.left + (offset?.x ?? 0);
          const y = previous.top - next.top + (offset?.y ?? 0);
          this.cancelAnimation(card);
          if (Math.abs(x) < 1 && Math.abs(y) < 1) continue;
          const rect = measurements.get(card)!;
          // Large reorders should settle at their destination instead of flying across the collection.
          if (Math.abs(x) > rect.width * 2 || Math.abs(y) > rect.height * 2) continue;
          const visible = (left: number, top: number) =>
            left < window.innerWidth && left + rect.width > 0 && top < window.innerHeight && top + rect.height > 0;
          if (!visible(rect.left, rect.top) && !visible(rect.left + x, rect.top + y)) continue;
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
    for (const card of this.animations.keys()) this.cancelAnimation(card);
  }

  private cancelAnimation(card: HTMLElement): void {
    const animation = this.animations.get(card);
    if (!animation) return;
    animation.onfinish = null;
    animation.cancel();
    this.animations.delete(card);
  }
}
