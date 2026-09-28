import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhotoPreview } from './photo-preview';

describe('PhotoPreview', () => {
  let fixture: ComponentFixture<PhotoPreview>;
  let page: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoPreview], providers: [provideZonelessChangeDetection()]
    }).compileComponents();
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'red';
    context.fillRect(0, 0, 200, 200);
    context.fillStyle = 'blue';
    context.fillRect(200, 0, 200, 200);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
    fixture = TestBed.createComponent(PhotoPreview);
    fixture.componentRef.setInput('file', new File([blob!], 'portrait.png', { type: 'image/png' }));
    page = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
    await page.querySelector<HTMLImageElement>('.source-photo')!.decode();
    page.querySelector('.source-photo')!.dispatchEvent(new Event('load'));
    await fixture.whenStable();
  });

  it('opens a modal with a circular selection, live preview and right-aligned actions', () => {
    expect(page.querySelector('dialog')!.open).toBeTrue();
    expect(page.querySelector('.portrait img')).not.toBeNull();
    expect(getComputedStyle(page.querySelector('footer')!).justifyContent).toBe('flex-end');
    const circle = page.querySelector<HTMLElement>('.crop-circle')!.getBoundingClientRect();
    expect(circle.width).toBeCloseTo(circle.height, 0);
  });

  it('bounds keyboard movement and exports the selected pixels', async () => {
    const circle = page.querySelector<HTMLButtonElement>('.crop-circle')!;
    for (let index = 0; index < 30; index++) {
      circle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }));
    }
    await fixture.whenStable();
    expect(parseFloat(circle.style.left)).toBe(60);
    const result = new Promise<File>((resolve) => fixture.componentInstance.applied.subscribe(resolve));
    page.querySelector<HTMLButtonElement>('app-button button')!.click();
    const file = await result;
    const bitmap = await createImageBitmap(file);
    expect(bitmap.width).toBe(160);
    expect(bitmap.height).toBe(160);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    expect(Array.from(context.getImageData(0, 0, 1, 1).data)).toEqual([0, 0, 255, 255]);
    bitmap.close();
  });

  it('moves the circle with a pointer and keeps it within the photo', async () => {
    const circle = page.querySelector<HTMLButtonElement>('.crop-circle')!;
    spyOn(circle, 'setPointerCapture');
    circle.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }));
    circle.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: -1000, clientY: -1000 }));
    circle.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    await fixture.whenStable();
    expect(parseFloat(circle.style.left)).toBe(0);
    expect(parseFloat(circle.style.top)).toBe(0);
  });

  it('resizes the circle and cancels without applying', async () => {
    const applied = jasmine.createSpy('applied');
    const cancelled = jasmine.createSpy('cancelled');
    fixture.componentInstance.applied.subscribe(applied);
    fixture.componentInstance.cancelled.subscribe(cancelled);
    const slider = page.querySelector<HTMLInputElement>('input[type="range"]')!;
    slider.value = '100';
    slider.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(page.querySelector<HTMLElement>('.crop-circle')!.style.height).toBe('100%');
    page.querySelector<HTMLButtonElement>('.cancel')!.click();
    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(applied).not.toHaveBeenCalled();
    expect(page.querySelector('dialog')!.open).toBeFalse();
  });

  it('handles Escape and releases the pending URL on destruction', () => {
    const cancelled = jasmine.createSpy('cancelled');
    fixture.componentInstance.cancelled.subscribe(cancelled);
    const url = page.querySelector<HTMLImageElement>('.source-photo')!.src;
    const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
    page.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(cancelled).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(revoke).toHaveBeenCalledWith(url);
  });

  it('reports decode errors with a dismissible custom toast and prevents applying an unreadable image', async () => {
    page.querySelector('.source-photo')!.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    const toast = page.querySelector('dialog app-toasts .toast.danger')!;
    expect(toast.getAttribute('role')).toBe('alert');
    expect(toast.textContent).toContain('could not be opened');
    expect(page.querySelector('[role="status"]')).toBeNull();
    toast.querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
    expect(page.querySelector('app-toasts .toast')).toBeNull();
    expect(page.querySelector<HTMLButtonElement>('app-button button')!.disabled).toBeTrue();
  });

  it('reports crop export failures in the dialog and allows retrying', async () => {
    const exportImage = spyOn(HTMLCanvasElement.prototype, 'toBlob').and.callFake((callback) => callback(null));
    const apply = page.querySelector<HTMLButtonElement>('app-button button')!;
    apply.click();
    await fixture.whenStable();
    const toast = page.querySelector('dialog app-toasts .toast.danger')!;
    expect(toast.textContent).toContain('The crop could not be applied. Please try again.');
    expect(page.querySelector('dialog')!.open).toBeTrue();
    expect(apply.disabled).toBeFalse();

    toast.querySelector<HTMLButtonElement>('button')!.click();
    exportImage.and.callThrough();
    const result = new Promise<File>((resolve) => fixture.componentInstance.applied.subscribe(resolve));
    apply.click();
    expect((await result).type).toBe('image/png');
    expect(page.querySelector('dialog')!.open).toBeFalse();
  });
});
