import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, Injector, viewChildren } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArrowLeft, LucideAngularModule } from 'lucide-angular';
import { ExpandPanel } from '../../shared/ui/expand-panel/expand-panel';

@Component({
  selector: 'app-guides',
  imports: [ExpandPanel, RouterLink, LucideAngularModule],
  templateUrl: './guides.html',
  styleUrl: './guides.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Guides {
  protected readonly ArrowLeftIcon = ArrowLeft;
  private readonly route = inject(ActivatedRoute);
  private readonly parameters = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap
  });
  protected readonly requestedGuide = computed(() => this.parameters().get('guide'));
  private readonly panels = viewChildren(ExpandPanel);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  constructor() {
    effect((onCleanup) => {
      const guide = this.requestedGuide();
      const panel = this.panels().find((panel) => panel.panelId() === guide);
      if (!panel) return;

      const render = afterNextRender(() => {
        const heading = this.element.nativeElement.querySelector<HTMLButtonElement>(`#${panel.panelId()}-heading`);
        heading?.focus({ preventScroll: true });
        heading?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }, { injector: this.injector });
      onCleanup(() => render.destroy());
    });
  }
}
