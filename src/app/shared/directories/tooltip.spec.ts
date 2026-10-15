import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Tooltip } from './tooltip';

@Component({
  imports: [Tooltip],
  template: `
    <p id="existing-help">Existing description</p>
    <button [appTooltip]="text()" [appTooltipLink]="link()" aria-describedby="existing-help">First</button>
    <button appTooltip="Second hint">Second</button>
  `
})
class TooltipHost {
  readonly text = signal('First hint');
  readonly link = signal('');
}

describe('Tooltip', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [TooltipHost], providers: [provideZonelessChangeDetection(), provideRouter([])]
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
  it('keeps linked help reachable by hover and keyboard and restores focus on Escape', async () => {
    const fixture = TestBed.createComponent(TooltipHost);
    fixture.componentInstance.link.set('/guides?guide=manage-experiences-guide');
    await fixture.whenStable();
    const [first, second] = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const hint = first.nextElementSibling as HTMLElement;
    const link = hint.querySelector('a')!;
    expect(hint.getAttribute('role')).toBe('note');
    expect(link.textContent).toBe('more');
    first.dispatchEvent(new MouseEvent('mouseenter'));
    first.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: link }));
    expect(hint.hidden).toBeFalse();
    first.focus();
    link.focus();
    expect(document.activeElement).toBe(link);
    expect(hint.hidden).toBeFalse();
    document.dispatchEvent(new Event('scroll'));
    expect(hint.hidden).toBeFalse();
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.activeElement).toBe(first);
    expect(hint.hidden).toBeTrue();
    first.dispatchEvent(new MouseEvent('mouseenter'));
    link.focus();
    second.focus();
    expect(hint.hidden).toBeTrue();
    fixture.destroy();
    expect(hint.isConnected).toBeFalse();
  });

  it('navigates through the router without activating the host button and preserves modified clicks', async () => {
    const fixture = TestBed.createComponent(TooltipHost);
    fixture.componentInstance.link.set('/guides?guide=manage-experiences-guide');
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    const link = button.nextElementSibling!.querySelector('a')!;
    const clicked = jasmine.createSpy('host click');
    button.addEventListener('click', clicked);
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    expect(link.getAttribute('href')).toBe('/guides?guide=manage-experiences-guide');
    // Inspect modified-click handling without letting the browser open another tab.
    const modified = new MouseEvent('click', { ctrlKey: true, cancelable: true });
    let prevented = true;
    link.addEventListener('click', (event) => { prevented = event.defaultPrevented; event.preventDefault(); }, { once: true });
    link.dispatchEvent(modified);
    expect(prevented).toBeFalse();
    expect(navigate).not.toHaveBeenCalled();
    link.click();
    expect(navigate).toHaveBeenCalledOnceWith('/guides?guide=manage-experiences-guide');
    expect(clicked).not.toHaveBeenCalled();
  });

  it('does not render unsafe or external help destinations', async () => {
    const fixture = TestBed.createComponent(TooltipHost);
    for (const destination of ['javascript:alert(1)', '//example.com', '/\\example.com', '/\n/example.com']) {
      fixture.componentInstance.link.set(destination);
      await fixture.whenStable();
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
      const hint = document.getElementById(button.getAttribute('aria-describedby')!.split(' ')[1])!;
      expect(hint.querySelector('a')).toBeNull();
      expect(hint.getAttribute('role')).toBe('tooltip');
    }
  });
});
