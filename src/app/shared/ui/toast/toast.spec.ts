import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Toasts } from './toast';
import { ToastService } from './toast.service';

describe('Toast notifications', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [Toasts], providers: [provideZonelessChangeDetection()]
  }));

  it('renders all themes, accessible announcements and independent dismissal', async () => {
    const fixture = TestBed.createComponent(Toasts);
    const toasts = TestBed.inject(ToastService);
    toasts.show('success', 'CV saved.');
    toasts.show('danger', 'Save failed.');
    toasts.show('alert', 'Please try again.');
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('.success')?.getAttribute('role')).toBe('status');
    expect(page.querySelector('.danger')?.getAttribute('role')).toBe('alert');
    expect(page.querySelector('.alert')?.textContent).toContain('Please try again.');
    page.querySelector<HTMLButtonElement>('.danger button')!.click();
    await fixture.whenStable();
    expect(page.querySelector('.danger')).toBeNull();
    expect(page.querySelectorAll('.toast').length).toBe(2);
    expect(getComputedStyle(page).position).toBe('fixed');
  });

  it('auto-dismisses success, pauses its timer, and retains danger and alert messages', () => {
    const toasts = TestBed.inject(ToastService);
    jasmine.clock().install();
    try {
      const success = toasts.show('success', 'Saved');
      toasts.show('danger', 'Failed');
      toasts.show('alert', 'Attention');
      jasmine.clock().tick(4000);
      toasts.pause(success);
      jasmine.clock().tick(6000);
      expect(toasts.messages().length).toBe(3);
      toasts.resume(success);
      jasmine.clock().tick(5000);
      expect(toasts.messages().map((message) => message.theme)).toEqual(['danger', 'alert']);
    } finally {
      jasmine.clock().uninstall();
    }
  });
});

