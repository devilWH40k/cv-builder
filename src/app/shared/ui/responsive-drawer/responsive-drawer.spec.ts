import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ResponsiveDrawer } from './responsive-drawer';

describe('Responsive drawer', () => {
  let media: MediaQueryList;

  beforeEach(() => {
    media = window.matchMedia('(max-width: 80rem)');
    Object.defineProperty(media, 'matches', { value: true, configurable: true });
    spyOn(window, 'matchMedia').and.returnValue(media);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  async function setup() {
    const fixture = TestBed.createComponent(ResponsiveDrawer);
    fixture.componentRef.setInput('label', 'Structure');
    fixture.componentRef.setInput('panelId', 'test-panel');
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    const trigger = host.querySelector<HTMLButtonElement>('.drawer-trigger')!;
    const panel = host.querySelector('dialog')!;
    return { fixture, host, trigger, panel };
  }

  it('opens a modal, focuses its close button, and restores focus after cancellation', async () => {
    const { fixture, host, trigger, panel } = await setup();
    expect(panel.open).toBeFalse();
    trigger.focus();
    trigger.click();
    await fixture.whenStable();
    expect(panel.matches(':modal')).toBeTrue();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(host.querySelector('.drawer-header button'));
    panel.dispatchEvent(new Event('cancel', { cancelable: true }));
    await fixture.whenStable();
    expect(panel.open).toBeFalse();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on backdrop click and before printing', async () => {
    const { fixture, trigger, panel } = await setup();
    trigger.click();
    await fixture.whenStable();
    const bounds = panel.getBoundingClientRect();
    panel.dispatchEvent(new MouseEvent('click', { clientX: bounds.right + 10, clientY: bounds.top + 10 }));
    await fixture.whenStable();
    expect(panel.open).toBeFalse();
    trigger.click();
    await fixture.whenStable();
    window.dispatchEvent(new Event('beforeprint'));
    await fixture.whenStable();
    expect(panel.open).toBeFalse();
  });

  it('returns to an inline panel on desktop and a closed menu when shrinking again', async () => {
    const { fixture, trigger, panel } = await setup();
    trigger.click();
    await fixture.whenStable();
    Object.defineProperty(media, 'matches', { value: false, configurable: true });
    media.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(panel.open).toBeTrue();
    expect(panel.matches(':modal')).toBeFalse();
    Object.defineProperty(media, 'matches', { value: true, configurable: true });
    media.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(panel.open).toBeFalse();
  });
});
