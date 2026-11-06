import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { ConstructorEditor } from '../../services/constructor-editor';
import { A4_WIDTH, A4_HEIGHT, PageGuide } from 'constructor/core';

@Component({
  selector: 'lib-constructor-rulers',
  templateUrl: './constructor-rulers.html',
  styleUrl: './constructor-rulers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(pointermove)': 'move($event)', '(pointerup)': 'finish($event)',
    '(pointercancel)': 'cancel()', '(keydown.escape)': 'escape($event)' },
})
export class ConstructorRulers {
  protected readonly editor = inject(ConstructorEditor);
  protected readonly width = A4_WIDTH;
  protected readonly height = A4_HEIGHT;
  protected readonly draft = signal<PageGuide | null>(null);
  protected readonly guides = computed(() => {
    const draft = this.draft();
    return draft ? [...this.editor.pageGuides().filter(g => g.id !== draft.id), draft] : this.editor.pageGuides();
  });
  protected readonly horizontalTicks = Array.from({ length: 16 }, (_, i) => i * 50);
  protected readonly verticalTicks = Array.from({ length: 23 }, (_, i) => i * 50);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private host: HTMLElement | null = null;
  private outside = false;

  protected start(event: PointerEvent, axis: 'x' | 'y', guide?: PageGuide): void {
    if (event.button !== 0 || this.editor.busy() || (!guide && this.editor.pageGuides().length >= 200)) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    this.host = target.closest('lib-constructor-rulers');
    if (guide) target.focus({ preventScroll: true });
    target.setPointerCapture(event.pointerId);
    this.draft.set(guide ?? { id: crypto.randomUUID(), axis, position: 0 });
    this.move(event);
  }
  protected move(event: PointerEvent): void {
    const guide = this.draft();
    if (!guide || !this.host) return;
    const bounds = this.host.getBoundingClientRect();
    const position = ((guide.axis === 'x' ? event.clientX - bounds.left : event.clientY - bounds.top) - 20) / this.editor.zoom();
    const max = guide.axis === 'x' ? A4_WIDTH : A4_HEIGHT;
    this.outside = position < 0 || position > max;
    this.draft.set({ ...guide, position: Math.max(0, Math.min(max, position)) });
  }
  protected finish(event: PointerEvent): void {
    if (!this.draft()) return;
    this.move(event);
    const guide = this.draft()!;
    this.editor.setPageGuides([...this.editor.pageGuides().filter(g => g.id !== guide.id), ...(this.outside ? [] : [guide])]);
    const id = this.outside ? null : guide.id;
    this.cancel();
    if (id) afterNextRender(() => {
      const buttons = this.element.nativeElement.querySelectorAll<HTMLButtonElement>('.guide');
      const index = this.editor.pageGuides().findIndex(g => g.id === id);
      buttons[index]?.focus({ preventScroll: true });
    }, { injector: this.injector });
  }
  protected cancel(): void { this.draft.set(null); this.host = null; }
  protected escape(event: Event): void {
    if (!this.draft()) return;
    event.preventDefault(); event.stopPropagation(); this.cancel();
  }
  protected key(event: KeyboardEvent, guide: PageGuide): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault(); event.stopPropagation();
      this.editor.setPageGuides(this.editor.pageGuides().filter(g => g.id !== guide.id));
    } else if ((guide.axis === 'x' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown']).includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      const delta = (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) * (event.shiftKey ? 10 : 1);
      this.editor.setPageGuides(this.editor.pageGuides().map(g => g.id === guide.id
        ? { ...g, position: Math.max(0, Math.min(guide.axis === 'x' ? A4_WIDTH : A4_HEIGHT, g.position + delta)) } : g));
    }
  }
}
