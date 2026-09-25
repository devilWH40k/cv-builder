import {
  afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef,
  inject, input, signal, viewChild
} from '@angular/core';
import { Form, LucideAngularModule, TableOfContents, X } from 'lucide-angular';

@Component({
  selector: 'app-responsive-drawer',
  imports: [LucideAngularModule],
  templateUrl: './responsive-drawer.html',
  styleUrl: './responsive-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeprint)': 'close()' }
})
export class ResponsiveDrawer {
  readonly label = input.required<string>();
  readonly panelId = input.required<string>();
  readonly side = input<'left' | 'right'>('left');
  protected readonly compact = signal(false);
  protected readonly opened = signal(false);
  protected readonly StructureIcon = Form;
  protected readonly ActionsIcon = TableOfContents;
  protected readonly CloseIcon = X;
  private readonly panel = viewChild.required<ElementRef<HTMLDialogElement>>('panel');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      // Keep this query aligned with the design system's breakpoint-xl.
      const query = window.matchMedia('(max-width: 80rem)');
      const sync = () => {
        this.close();
        this.compact.set(query.matches);
      };
      sync();
      query.addEventListener('change', sync);
      this.destroyRef.onDestroy(() => query.removeEventListener('change', sync));
    });
  }

  protected open(): void {
    if (!this.compact()) return;
    this.panel().nativeElement.showModal();
    this.opened.set(true);
  }

  close(): void {
    if (this.opened()) this.panel().nativeElement.close();
    this.opened.set(false);
  }

  protected dismissBackdrop(event: MouseEvent): void {
    const panel = this.panel().nativeElement;
    if (event.target !== panel) return;
    const bounds = panel.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) this.close();
  }
}
