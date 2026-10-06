import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Tooltip } from './tooltip';

@Component({
  imports: [Tooltip],
  template: `
    <p id="existing-help">Existing description</p>
    <button [appTooltip]="text()" aria-describedby="existing-help">First</button>
    <button appTooltip="Second hint">Second</button>
  `
})
class TooltipHost {
  readonly text = signal('First hint');
}

describe('Tooltip', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [TooltipHost], providers: [provideZonelessChangeDetection()]
  }));

  it('supports independent hints, hover, focus, tap, and Escape without losing existing descriptions', async () => {
    const fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    const [first, second] = Array.from(page.querySelectorAll('button'));
    const firstIds = first.getAttribute('aria-describedby')!.split(' ');
    const hint = document.getElementById(firstIds[1])!;
    const secondHint = document.getElementById(second.getAttribute('aria-describedby')!)!;
    expect(firstIds[0]).toBe('existing-help');
    expect(hint.id).not.toBe(secondHint.id);
    expect(hint.hidden).toBeTrue();
    first.dispatchEvent(new MouseEvent('mouseenter'));
    expect(hint.hidden).toBeFalse();
    expect(secondHint.hidden).toBeTrue();
    first.dispatchEvent(new MouseEvent('mouseleave'));
    expect(hint.hidden).toBeTrue();
    first.focus();
    expect(hint.hidden).toBeFalse();
    document.dispatchEvent(new Event('scroll'));
    expect(hint.hidden).toBeFalse();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(hint.hidden).toBeTrue();
    first.click();
    expect(hint.hidden).toBeFalse();
    first.blur();
    expect(hint.hidden).toBeTrue();
    fixture.destroy();
    expect(hint.isConnected).toBeFalse();
    expect(secondHint.isConnected).toBeFalse();
    expect(first.getAttribute('aria-describedby')).toBe('existing-help');
  });

  it('updates plain text safely, hides empty hints, and dismisses on scrolling', async () => {
    const fixture = TestBed.createComponent(TooltipHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    const hint = document.getElementById(button.getAttribute('aria-describedby')!.split(' ')[1])!;
    button.click();
    fixture.componentInstance.text.set('<b>Updated hint</b>');
    await fixture.whenStable();
    expect(hint.textContent).toBe('<b>Updated hint</b>');
    expect(hint.querySelector('b')).toBeNull();
    document.dispatchEvent(new Event('scroll'));
    expect(hint.hidden).toBeTrue();
    button.click();
    fixture.componentInstance.text.set('');
    await fixture.whenStable();
    expect(hint.hidden).toBeTrue();
    expect(button.getAttribute('aria-describedby')).toBe('existing-help');
  });
});
