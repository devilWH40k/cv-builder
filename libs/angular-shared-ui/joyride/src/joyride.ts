import {
  afterNextRender, afterRenderEffect, ChangeDetectionStrategy, Component, computed,
  DestroyRef, ElementRef, inject, input, output, signal, viewChild,
} from '@angular/core';
import { Button } from 'angular-shared-ui/button';
import { DialogOverlay } from 'angular-shared-ui/dialog';
import { JoyrideTargets } from './joyride-target';

export interface JoyrideStep {
  readonly target: string;
  readonly title: string;
  readonly description: string;
}

@Component({
  selector: 'app-joyride',
  imports: [Button, DialogOverlay],
  templateUrl: './joyride.html',
  styleUrl: './joyride.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Joyride {
  readonly steps = input.required<readonly JoyrideStep[]>();
  readonly stepChanged = output<number>();
  readonly finished = output<void>();
  protected readonly index = signal(0);
  protected readonly step = computed<JoyrideStep | undefined>(() => this.steps()[this.index()]);
  protected readonly last = computed(() => this.index() === this.steps().length - 1);
  protected readonly highlight = signal({ left: 0, top: 0, width: 0, height: 0 });
  protected readonly position = signal({ left: 16, top: 16 });
  private readonly overlay = viewChild.required(DialogOverlay);
  private readonly card = viewChild.required<ElementRef<HTMLDialogElement>>('card');
  private readonly targets = inject(JoyrideTargets);
  private observer: ResizeObserver | null = null;

  constructor() {
    afterNextRender(() => {
      this.overlay().open();
      const layer = this.card().nativeElement.parentElement;
      if (layer) layer.style.background = 'transparent';
      this.observer = new ResizeObserver(this.place);
      this.observer.observe(this.card().nativeElement);
      window.addEventListener('resize', this.place);
      window.addEventListener('scroll', this.place, true);
    });
    afterRenderEffect(() => {
      const target = this.targets.get(this.step()?.target ?? '');
      target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      this.place();
    });
    inject(DestroyRef).onDestroy(() => {
      this.observer?.disconnect();
      window.removeEventListener('resize', this.place);
      window.removeEventListener('scroll', this.place, true);
    });
  }

  protected move(delta: number): void {
    const next = this.index() + delta;
    if (next < 0 || next >= this.steps().length) return;
    this.index.set(next);
    this.stepChanged.emit(next);
  }

  protected dismiss(event?: Event): void {
    event?.preventDefault();
    this.finished.emit();
  }

  protected keyboard(event: KeyboardEvent): void {
    if (event.key === 'Tab' || event.key === 'Escape') return;
    // Keep editor shortcuts and its Escape handler outside the tutorial.
    event.stopPropagation();
    if ((event.ctrlKey || event.metaKey) && ['s', 'i', 'e'].includes(event.key.toLowerCase())) {
      event.preventDefault();
    }
  }

  private readonly place = (): void => {
    const target = this.targets.get(this.step()?.target ?? '');
    const rect = target?.getBoundingClientRect();
    const margin = 16;
    const width = this.card().nativeElement.offsetWidth || 352;
    const height = this.card().nativeElement.offsetHeight || 240;
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const maxTop = Math.max(margin, window.innerHeight - height - margin);
    const left = rect ? Math.max(8, rect.left - 4) : 0;
    const top = rect ? Math.max(8, rect.top - 4) : 0;
    this.highlight.set({ left, top,
      width: rect ? Math.max(0, Math.min(window.innerWidth - 8, rect.right + 4) - left) : 0,
      height: rect ? Math.max(0, Math.min(window.innerHeight - 8, rect.bottom + 4) - top) : 0 });
    let cardLeft = rect ? rect.right + margin : margin;
    let cardTop = rect?.top ?? margin;
    if (cardLeft > maxLeft && rect) {
      if (rect.left - width - margin >= margin) cardLeft = rect.left - width - margin;
      else {
        cardLeft = rect.left;
        cardTop = rect.bottom + margin <= maxTop ? rect.bottom + margin : rect.top - height - margin;
      }
    }
    this.position.set({ left: Math.min(maxLeft, Math.max(margin, cardLeft)),
      top: Math.min(maxTop, Math.max(margin, cardTop)) });
  };
}
