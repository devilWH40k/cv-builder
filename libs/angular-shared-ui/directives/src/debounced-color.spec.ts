import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DebouncedColor } from './debounced-color';

@Component({
  imports: [DebouncedColor],
  template: '<input type="color" appDebouncedColor (colorCommitted)="colors.push($event)" /><button>Outside</button>',
})
class Host {
  readonly colors: string[] = [];
}

describe('Debounced color picker', () => {
  it('coalesces changes and flushes before an outside click or blur', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const change = (color: string) => { input.value = color; input.dispatchEvent(new Event('input')); };
    jasmine.clock().install();
    jasmine.clock().mockDate();
    try {
      change('#ff0000');
      jasmine.clock().tick(100);
      change('#00ff00');
      jasmine.clock().tick(149);
      expect(fixture.componentInstance.colors).toEqual([]);
      jasmine.clock().tick(1);
      expect(fixture.componentInstance.colors).toEqual(['#00ff00']);
      change('#0000ff');
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      expect(fixture.componentInstance.colors).toEqual(['#00ff00', '#0000ff']);
      input.dispatchEvent(new FocusEvent('blur'));
      jasmine.clock().tick(150);
      expect(fixture.componentInstance.colors.length).toBe(2);
      change('#123456');
      input.dispatchEvent(new FocusEvent('blur'));
      expect(fixture.componentInstance.colors[2]).toBe('#123456');
      change('#654321');
      fixture.destroy();
      jasmine.clock().tick(200);
      expect(fixture.componentInstance.colors.length).toBe(3);
    } finally { jasmine.clock().uninstall(); }
  });
});
