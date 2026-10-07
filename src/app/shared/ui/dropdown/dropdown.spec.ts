import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dropdown } from './dropdown';

describe('Dropdown', () => {
  let fixture: ComponentFixture<Dropdown>;
  let host: HTMLElement;
  let trigger: HTMLButtonElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(Dropdown);
    fixture.componentRef.setInput('menuId', 'test-menu');
    fixture.componentRef.setInput('label', 'Actions');
    fixture.componentRef.setInput('items', [
      { id: 'first', label: 'First' }, { id: 'disabled', label: 'Disabled', disabled: true },
      { id: 'last', label: 'Last' }
    ]);
    await fixture.whenStable();
    host = fixture.nativeElement;
    trigger = host.querySelector('button')!;
  });

  it('opens on hover, remains open on trigger click, selects an item and closes', async () => {
    const selected = jasmine.createSpy('selected');
    fixture.componentInstance.selected.subscribe(selected);
    host.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    trigger.click();
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    host.querySelector<HTMLButtonElement>('[role="menuitem"]')!.click();
    await fixture.whenStable();
    expect(selected).toHaveBeenCalledOnceWith({ id: 'first', label: 'First' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('supports touch clicks, pointer departure, and outside dismissal', async () => {
    host.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    host.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    host.dispatchEvent(new PointerEvent('pointerleave'));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('navigates enabled items by keyboard and restores trigger focus on Escape', async () => {
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();
    const items = host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    expect(document.activeElement).toBe(items[0]);
    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();
    expect(document.activeElement).toBe(items[2]);
    host.dispatchEvent(new PointerEvent('pointerleave'));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    items[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
