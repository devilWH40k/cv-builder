import { Component, provideZonelessChangeDetection, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ContextMenu, ContextMenuItem } from './context-menu';

@Component({
  imports: [ContextMenu],
  template: `<button class="source" (contextmenu)="menu().open($event)">Source</button>
    <button class="outside">Outside</button>
    <app-context-menu [items]="items" (selected)="selected = $event" />`
})
class MenuHarness {
  readonly menu = viewChild.required(ContextMenu);
  readonly items: readonly ContextMenuItem[] = [
    { id: 'open', label: 'Open', href: '/create?id=saved', newTab: true },
    { id: 'disabled', label: 'Unavailable', disabled: true },
    { id: 'cut', label: 'Cut' }
  ];
  selected = '';
}

describe('Shared context menu', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [MenuHarness], providers: [provideZonelessChangeDetection()] }));

  async function open(x = 50, y = 50) {
    const fixture = TestBed.createComponent(MenuHarness);
    await fixture.whenStable();
    const source: HTMLButtonElement = fixture.nativeElement.querySelector('.source');
    source.focus();
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, clientX: x, clientY: y });
    source.dispatchEvent(event);
    await fixture.whenStable();
    return { fixture, source, event, menu: document.querySelector<HTMLElement>('.context-menu')! };
  }

  it('opens above containers, clamps to the viewport, and renders safe new-tab links', async () => {
    const { fixture, source, event, menu } = await open(innerWidth - 1, innerHeight - 1);
    expect(event.defaultPrevented).toBeTrue();
    expect(menu.parentElement).toBe(document.body);
    const bounds = menu.getBoundingClientRect();
    expect(bounds.right).toBeLessThanOrEqual(document.documentElement.clientWidth + 1);
    expect(bounds.bottom).toBeLessThanOrEqual(document.documentElement.clientHeight + 1);
    const link = menu.querySelector<HTMLAnchorElement>('a')!;
    expect(link.getAttribute('href')).toBe('/create?id=saved');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    expect(document.activeElement).toBe(link);
    expect(menu.querySelector<HTMLButtonElement>('[data-menu-id="disabled"]')!.disabled).toBeTrue();
    fixture.destroy();
    expect(document.querySelector('.context-menu')).toBeNull();
    const key = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    document.dispatchEvent(key);
    expect(key.defaultPrevented).toBeFalse();
  });

  it('skips disabled items, selects with the keyboard, and restores focus', async () => {
    const { fixture, source, menu } = await open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(menu.querySelector('[data-menu-id="cut"]'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.selected).toBe('cut');
    expect(document.querySelector('.context-menu')).toBeNull();
    expect(document.activeElement).toBe(source);
  });

  it('stops Escape before an enclosing dialog and dismisses on outside pointer events', async () => {
    const { fixture, source } = await open();
    const escaped = jasmine.createSpy('escaped');
    document.addEventListener('keydown', escaped);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    document.removeEventListener('keydown', escaped);
    expect(escaped).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(source);
    source.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 }));
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.outside').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await fixture.whenStable();
    expect(document.querySelector('.context-menu')).toBeNull();
    source.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 50, clientY: 50 }));
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.outside').focus();
    await fixture.whenStable();
    expect(document.querySelector('.context-menu')).toBeNull();
  });

  it('supports keyboard context-menu positioning and closes on scroll', async () => {
    const { fixture, source, menu } = await open(0, 0);
    expect(menu.getBoundingClientRect().top).toBeCloseTo(source.getBoundingClientRect().bottom, 0);
    document.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    expect(document.querySelector('.context-menu')).toBeNull();
  });
});
