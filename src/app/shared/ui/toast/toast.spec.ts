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

  it('renders only the five newest notifications when more arrive', async () => {
    const fixture = TestBed.createComponent(Toasts);
    const toasts = TestBed.inject(ToastService);
    const themes = ['success', 'danger', 'alert'] as const;
    for (let index = 1; index <= 8; index++) {
      toasts.show(themes[index % themes.length], 'Notification ' + index);
      expect(toasts.messages().length).toBeLessThanOrEqual(5);
    }
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(Array.from(page.querySelectorAll('.toast .content p'), (message) => message.textContent))
      .toEqual(['Notification 4', 'Notification 5', 'Notification 6', 'Notification 7', 'Notification 8']);
  });

  it('dismisses visible messages without restoring older notifications and fills available slots first', () => {
    const toasts = TestBed.inject(ToastService);
    const ids = Array.from({ length: 7 }, (_, index) => toasts.show('danger', 'Error ' + (index + 1)));
    toasts.dismiss(ids[4]);
    expect(toasts.messages().map((message) => message.message)).toEqual(['Error 3', 'Error 4', 'Error 6', 'Error 7']);
    toasts.show('alert', 'Attention 8');
    expect(toasts.messages().map((message) => message.message))
      .toEqual(['Error 3', 'Error 4', 'Error 6', 'Error 7', 'Attention 8']);
    toasts.show('alert', 'Attention 9');
    expect(toasts.messages().map((message) => message.message))
      .toEqual(['Error 4', 'Error 6', 'Error 7', 'Attention 8', 'Attention 9']);
  });

  it('cancels auto-dismissal for replaced toasts without changing newer toast lifetimes', () => {
    const toasts = TestBed.inject(ToastService);
    jasmine.clock().install();
    try {
      const oldest = toasts.show('success', 'Old success');
      jasmine.clock().tick(1000);
      for (let index = 0; index < 4; index++) toasts.show('alert', 'Attention ' + index);
      const newest = toasts.show('success', 'New success');
      const dismiss = spyOn(toasts, 'dismiss').and.callThrough();
      toasts.resume(oldest);
      jasmine.clock().tick(4000);
      expect(dismiss).not.toHaveBeenCalled();
      expect(toasts.messages().at(-1)?.id).toBe(newest);
      jasmine.clock().tick(1000);
      expect(dismiss).toHaveBeenCalledOnceWith(newest);
      expect(toasts.messages().length).toBe(4);
      expect(toasts.messages().every((message) => message.theme === 'alert')).toBeTrue();
    } finally {
      jasmine.clock().uninstall();
    }
  });
});

