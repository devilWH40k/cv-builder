import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Resizable } from './resizable';

describe('Resizable', () => {
  async function setup() {
    TestBed.configureTestingModule({
      imports: [Resizable], providers: [provideZonelessChangeDetection()]
    });
    const fixture = TestBed.createComponent(Resizable);
    fixture.componentRef.setInput('size', 150);
    fixture.componentRef.setInput('minSize', 90);
    fixture.componentRef.setInput('maxSize', 230);
    fixture.componentInstance.sizeChange.subscribe((size) => fixture.componentRef.setInput('size', size));
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    // Synthetic PointerEvents do not create an active native pointer to capture.
    spyOn(host, 'setPointerCapture');
    spyOn(host, 'hasPointerCapture').and.returnValue(true);
    spyOn(host, 'releasePointerCapture');
    const pointer = async (type: string, x: number, y: number, pointerId = 1) => {
      host.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId, button: 0 }));
      await fixture.whenStable();
    };
    return { fixture, host, pointer };
  }

  it('resizes at half scale, clamps both bounds, and stops after release', async () => {
    const { fixture, host, pointer } = await setup();
    host.style.zoom = '0.5';
    expect(getComputedStyle(host).cursor).toBe('nwse-resize');
    expect(host.getBoundingClientRect().width).toBeCloseTo(75);
    await pointer('pointerdown', 100, 100);
    expect(host.setPointerCapture).toHaveBeenCalledWith(1);
    await pointer('pointermove', 115, 115);
    expect(fixture.componentInstance.size()).toBeCloseTo(180);
    await pointer('pointermove', 500, 500, 2);
    expect(fixture.componentInstance.size()).toBeCloseTo(180);
    await pointer('pointermove', 500, 500);
    expect(fixture.componentInstance.size()).toBe(230);
    await pointer('pointermove', 0, 0);
    expect(fixture.componentInstance.size()).toBe(90);
    await pointer('pointerup', 0, 0);
    expect(host.releasePointerCapture).toHaveBeenCalledWith(1);
    await pointer('pointermove', 200, 200);
    expect(fixture.componentInstance.size()).toBe(90);
  });

  it('restores the original size when a drag is cancelled', async () => {
    const { fixture, host, pointer } = await setup();
    await pointer('pointerdown', 100, 100);
    await pointer('pointermove', 120, 120);
    await pointer('pointercancel', 120, 120);
    expect(fixture.componentInstance.size()).toBe(150);
    await pointer('pointerdown', 100, 100);
    await pointer('pointermove', 120, 120);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(fixture.componentInstance.size()).toBe(150);
    expect(host.classList.contains('resizing')).toBeFalse();
  });

  it('supports keyboard resizing with accessible size limits', async () => {
    const { fixture, host } = await setup();
    fixture.componentRef.setInput('step', 5);
    const key = async (key: string) => {
      host.dispatchEvent(new KeyboardEvent('keydown', { key }));
      await fixture.whenStable();
    };
    await key('ArrowRight');
    expect(fixture.componentInstance.size()).toBe(155);
    await key('ArrowDown');
    expect(fixture.componentInstance.size()).toBe(150);
    await key('End');
    await key('ArrowUp');
    expect(fixture.componentInstance.size()).toBe(230);
    await key('Home');
    await key('ArrowLeft');
    expect(fixture.componentInstance.size()).toBe(90);
    expect(host.getAttribute('aria-valuenow')).toBe('90');
    expect(host.getAttribute('aria-valuemin')).toBe('90');
    expect(host.getAttribute('aria-valuemax')).toBe('230');
  });
});
