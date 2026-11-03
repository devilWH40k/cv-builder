import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Joyride } from './joyride';
import { JoyrideTarget } from './joyride-target';

@Component({
  imports: [Joyride, JoyrideTarget],
  template: `
    <button uiJoyrideTarget="first">First tool</button>
    <button uiJoyrideTarget="second">Second tool</button>
    @if (open()) {
      <ui-joyride [steps]="steps" (stepChanged)="selected.set($event)" (finished)="open.set(false)" />
    }
  `,
})
class TestHost {
  readonly open = signal(true);
  readonly selected = signal(0);
  readonly steps = [
    { target: 'first', title: 'First step', description: 'Use the first tool.' },
    { target: 'second', title: 'Second step', description: 'Use the second tool.' },
  ];
}

describe('Shared joyride', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  it('highlights targets and supports next, previous, and finish', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('dialog.joyride')!;
    const buttons = () => Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'));
    expect(dialog.open).toBeTrue();
    expect(dialog.textContent).toContain('Step 1 of 2');
    expect(buttons().map((button) => button.textContent?.trim())).toEqual(['Skip', 'Prev', 'Next']);
    expect(buttons()[1].disabled).toBeTrue();
    expect(buttons()[2].getBoundingClientRect().height).toBe(32);
    const spotlight = dialog.querySelector<HTMLElement>('.spotlight')!;
    expect(parseFloat(spotlight.style.width)).toBeGreaterThan(0);
    buttons()[2].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.selected()).toBe(1);
    expect(dialog.textContent).toContain('Second step');
    expect(buttons().map((button) => button.textContent?.trim())).toEqual(['Prev', 'Finish']);
    expect(buttons()[1].classList.contains('monochrome')).toBeFalse();
    expect(buttons()[0].getBoundingClientRect().left).toBeLessThan(buttons()[1].getBoundingClientRect().left);
    buttons()[0].click();
    await fixture.whenStable();
    expect(dialog.textContent).toContain('First step');
    buttons()[2].click();
    await fixture.whenStable();
    buttons()[1].click();
    await fixture.whenStable();
    expect(document.querySelector('dialog.joyride')).toBeNull();
    expect(document.querySelector('.dialog-overlay')).toBeNull();
  });

  it('supports Escape and restores focus and background interaction', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('dialog.joyride')!;
    const buttons = dialog.querySelectorAll<HTMLButtonElement>('button');
    buttons[2].focus();
    buttons[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(buttons[0]);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBeFalse();
    expect(fixture.nativeElement.inert).toBeFalse();
  });
});
