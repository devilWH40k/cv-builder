import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragDrop, DragItem } from './drag-drop';
import { Draggable } from './draggable';
import { DropTarget } from './drop-target';

@Component({
  imports: [Draggable, DropTarget],
  template: `
    <div class="stage">
      <app-draggable dragId="document" dragType="document" [disabled]="disabled()">
        <article class="sample">
          <a id="original-link" href="#" [draggable]="false" (click)="$event.preventDefault(); clicks.update(increment)">
            <strong>Document title</strong><span>General position</span>
          </a>
          <button type="button">Delete</button>
        </article>
      </app-draggable>
      <div class="target" [appDropTarget]="targetType()" [dropDisabled]="targetDisabled()"
        (itemDropped)="drops.update(appendDrop($event))"><span>Folder</span></div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .stage { display: flex; gap: 20px; }
    app-draggable { width: 180px; }
    .sample { width: 100%; height: 120px; background: rgb(241, 245, 249); color: rgb(15, 23, 42); }
    a { display: flex; flex-direction: column; font-size: 18px; }
    .target { width: 160px; height: 120px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
class DragHarness {
  readonly disabled = signal(false);
  readonly targetDisabled = signal(false);
  readonly targetType = signal('document');
  readonly clicks = signal(0);
  readonly drops = signal<readonly DragItem[]>([]);
  readonly increment = (count: number) => count + 1;
  appendDrop(item: DragItem): (items: readonly DragItem[]) => readonly DragItem[] {
    return (items) => [...items, item];
  }
}

describe('Shared pointer draggable', () => {
  let fixture: ComponentFixture<DragHarness>;
  let source: HTMLElement;
  let link: HTMLAnchorElement;
  let target: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [DragHarness], providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(DragHarness);
    await fixture.whenStable();
    source = fixture.nativeElement.querySelector('app-draggable');
    link = source.querySelector('a')!;
    target = fixture.nativeElement.querySelector('.target');
    source.scrollIntoView({ block: 'center' });
  });

  function pointer(type: string, x: number, y: number, element: EventTarget = document, pointerId = 1): void {
    element.dispatchEvent(new PointerEvent(type, {
      pointerId, pointerType: 'mouse', button: 0, clientX: x, clientY: y, bubbles: true, cancelable: true
    }));
  }

  async function start(): Promise<DOMRect> {
    const rect = source.getBoundingClientRect();
    pointer('pointerdown', rect.left + 20, rect.top + 20, link);
    pointer('pointermove', rect.left + 40, rect.top + 30);
    await fixture.whenStable();
    return rect;
  }

  function atTarget(type: string): void {
    const rect = target.getBoundingClientRect();
    pointer(type, rect.left + 20, rect.top + 20);
  }

  it('preserves normal clicks and ignores movement below the drag threshold', async () => {
    const rect = source.getBoundingClientRect();
    pointer('pointerdown', rect.left + 20, rect.top + 20, link);
    pointer('pointermove', rect.left + 22, rect.top + 20);
    pointer('pointerup', rect.left + 22, rect.top + 20);
    link.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.clicks()).toBe(1);
    expect(document.querySelector('.app-drag-preview')).toBeNull();
    expect(getComputedStyle(source).display).not.toBe('none');
  });

  it('holds the full opaque item at its original size and removes the source from layout', async () => {
    const color = getComputedStyle(source.querySelector('article')!).backgroundColor;
    const rect = await start();
    const preview = document.querySelector<HTMLElement>('.app-drag-preview')!;
    expect(preview.textContent).toContain('Document title');
    expect(preview.textContent).toContain('General position');
    expect(preview.textContent).toContain('Delete');
    expect(getComputedStyle(preview).opacity).toBe('1');
    expect(getComputedStyle(preview).filter).toBe('none');
    expect(getComputedStyle(preview).pointerEvents).toBe('none');
    expect(getComputedStyle(preview.querySelector('article')!).backgroundColor).toBe(color);
    expect(preview.getBoundingClientRect().width).toBeCloseTo(rect.width, 0);
    expect(preview.getBoundingClientRect().height).toBeCloseTo(rect.height, 0);
    expect(preview.getBoundingClientRect().left).toBeCloseTo(rect.left + 20, 0);
    expect(preview.getBoundingClientRect().top).toBeCloseTo(rect.top + 10, 0);
    expect(getComputedStyle(source).display).toBe('none');
    expect(preview.getAttribute('aria-hidden')).toBe('true');
    expect(preview.inert).toBeTrue();
    expect(document.querySelectorAll('#original-link').length).toBe(1);
  });

  it('highlights a matching target and emits one drop with the item identity', async () => {
    await start();
    atTarget('pointermove');
    await fixture.whenStable();
    expect(target.classList.contains('drop-target')).toBeTrue();
    atTarget('pointerup');
    await fixture.whenStable();
    expect(fixture.componentInstance.drops()).toEqual([{ id: 'document', type: 'document' }]);
    expect(target.classList.contains('drop-target')).toBeFalse();
    expect(document.querySelector('.app-drag-preview')).toBeNull();
    expect(getComputedStyle(source).display).not.toBe('none');
  });

  for (const reason of ['incompatible', 'disabled']) {
    it(`restores the source without dropping on an ${reason} target`, async () => {
      if (reason === 'incompatible') fixture.componentInstance.targetType.set('other');
      else fixture.componentInstance.targetDisabled.set(true);
      await fixture.whenStable();
      await start();
      atTarget('pointerup');
      await fixture.whenStable();
      expect(fixture.componentInstance.drops()).toEqual([]);
      expect(getComputedStyle(source).display).not.toBe('none');
      expect(document.querySelector('.app-drag-preview')).toBeNull();
    });
  }

  for (const cancellation of ['escape', 'pointercancel', 'blur']) {
    it(`restores the source and cleans up on ${cancellation}`, async () => {
      await start();
      if (cancellation === 'escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      else if (cancellation === 'blur') window.dispatchEvent(new Event('blur'));
      else pointer('pointercancel', 0, 0);
      atTarget('pointerup');
      await fixture.whenStable();
      expect(fixture.componentInstance.drops()).toEqual([]);
      expect(getComputedStyle(source).display).not.toBe('none');
      expect(document.querySelector('.app-drag-preview')).toBeNull();
      expect(document.body.classList.contains('app-dragging')).toBeFalse();
    });
  }

  it('suppresses the click generated by releasing a drag but permits the next click', async () => {
    await start();
    atTarget('pointerup');
    link.click();
    expect(fixture.componentInstance.clicks()).toBe(0);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    link.click();
    expect(fixture.componentInstance.clicks()).toBe(1);
  });

  it('does not drag action buttons or disabled content', async () => {
    const rect = source.getBoundingClientRect();
    pointer('pointerdown', rect.left + 20, rect.top + 20, source.querySelector('button')!);
    pointer('pointermove', rect.left + 40, rect.top + 30);
    expect(TestBed.inject(DragDrop).active()).toBeNull();
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    await start();
    expect(document.querySelector('.app-drag-preview')).toBeNull();
  });

  it('removes previews and listeners if the source is destroyed during a drag', async () => {
    const drag = TestBed.inject(DragDrop);
    await start();
    fixture.destroy();
    expect(drag.active()).toBeNull();
    expect(document.querySelector('.app-drag-preview')).toBeNull();
    pointer('pointermove', 100, 100);
    pointer('pointerup', 100, 100);
    expect(document.querySelector('.app-drag-preview')).toBeNull();
  });
});
