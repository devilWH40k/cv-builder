import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConstructorRulers } from './constructor-rulers';
import { ConstructorEditor } from '../../services/constructor-editor';
import { PageGuide } from '../../interfaces/constructor-document';

describe('Ruler guide keyboard controls', () => {
  it('focuses a clicked guide and moves and deletes it with the keyboard', async () => {
    const guides = signal<readonly PageGuide[]>([{ id: 'guide', axis: 'x', position: 60 }]);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), {
      provide: ConstructorEditor, useValue: {
        pageGuides: guides, zoom: signal(1), busy: signal(false),
        setPageGuides: (value: readonly PageGuide[]) => guides.set(value),
      },
    }] });
    const fixture = TestBed.createComponent(ConstructorRulers);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('.guide') as HTMLButtonElement;
    spyOn(button, 'setPointerCapture');
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(document.activeElement).toBe(button);
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(guides()[0].position).toBe(61);
    await fixture.whenStable();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true, bubbles: true }));
    expect(guides()[0].position).toBe(51);
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    expect(guides()).toEqual([]);
  });
});
