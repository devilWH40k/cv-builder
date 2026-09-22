import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Create } from './create';

describe('CV form', () => {
  let fixture: ComponentFixture<Create>;
  let page: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Create],
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(Create);
    page = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  function submit(): void {
    page.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
  }

  function enterText(id: string, value: string): void {
    const element = page.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
    element.value = value;
    element.dispatchEvent(new Event('input'));
    element.dispatchEvent(new Event('blur'));
  }

  function selectFile(file: File): void {
    const input = page.querySelector<HTMLInputElement>('input[type="file"]')!;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
  }

  it('starts neutral with a three-row textarea and fixed error space', async () => {
    expect(page.querySelector('textarea')?.rows).toBe(3);
    expect(page.querySelectorAll('.invalid, .success').length).toBe(0);
    const fields = Array.from(page.querySelectorAll<HTMLElement>('.field'));
    const heights = fields.map((field) => field.getBoundingClientRect().height);
    const log = spyOn(console, 'log');

    submit();
    await fixture.whenStable();

    expect(log).not.toHaveBeenCalled();
    expect(page.querySelectorAll('.invalid').length).toBe(3);
    expect(page.querySelector('#name')?.getAttribute('aria-invalid')).toBe('true');
    expect(page.querySelector('#name-error')?.textContent).toContain('Please enter your name.');
    expect(fields.map((field) => field.getBoundingClientRect().height)).toEqual(heights);
  });

  it('shows success marks and logs the entered data on Create', async () => {
    const log = spyOn(console, 'log');
    enterText('name', 'Alex Morgan');
    enterText('position-title', 'Designer');
    enterText('description', 'I design accessible applications.');
    await fixture.whenStable();

    expect(page.querySelectorAll('.success-icon').length).toBe(3);
    expect(page.querySelector('#name')?.getAttribute('aria-invalid')).toBe('false');
    submit();
    expect(log).toHaveBeenCalledOnceWith('CV info', {
      name: 'Alex Morgan',
      positionTitle: 'Designer',
      description: 'I design accessible applications.',
      photo: null
    });
  });

  it('rejects whitespace-only required fields', async () => {
    const log = spyOn(console, 'log');
    enterText('name', '   ');
    enterText('position-title', '   ');
    enterText('description', '\n  ');
    submit();
    await fixture.whenStable();
    expect(page.querySelectorAll('.invalid').length).toBe(3);
    expect(log).not.toHaveBeenCalled();
  });

  for (const [name, type] of [
    ['photo.jpg', 'image/jpeg'],
    ['photo.JPEG', 'image/jpeg'],
    ['photo.png', 'image/png']
  ]) {
    it(`accepts ${name} and includes the selected file in form data`, async () => {
      const file = new File(['image'], name, { type });
      selectFile(file);
      await fixture.whenStable();
      expect(fixture.componentInstance.form.controls.photo.value).toBe(file);
      expect(fixture.componentInstance.form.controls.photo.valid).toBeTrue();
      expect(page.querySelector('app-file-upload .success')).not.toBeNull();
      expect(page.querySelector('.filename')?.textContent).toBe(name);
    });
  }

  it('rejects unsupported files without shifting the upload and recovers on replacement', async () => {
    const upload = page.querySelector<HTMLElement>('app-file-upload')!;
    const height = upload.getBoundingClientRect().height;
    selectFile(new File(['image'], 'photo.gif', { type: 'image/gif' }));
    await fixture.whenStable();
    expect(page.querySelector('#photo-error')?.textContent).toContain('JPG, JPEG or PNG');
    expect(page.querySelector('#photo')?.getAttribute('aria-invalid')).toBe('true');
    expect(upload.getBoundingClientRect().height).toBe(height);

    selectFile(new File(['image'], 'photo.png', { type: 'image/png' }));
    await fixture.whenStable();
    expect(page.querySelector('#photo-error')?.textContent?.trim()).toBe('');
    expect(page.querySelector('#photo')?.getAttribute('aria-invalid')).toBe('false');
    expect(upload.getBoundingClientRect().height).toBe(height);
  });

  it('rejects a supported extension with an unsupported MIME type', async () => {
    selectFile(new File(['text'], 'photo.jpg', { type: 'text/plain' }));
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.photo.hasError('imageType')).toBeTrue();
  });

  it('updates custom controls when disabled and reset from the form', async () => {
    enterText('name', 'Alex');
    selectFile(new File(['image'], 'photo.png', { type: 'image/png' }));
    fixture.componentInstance.form.disable();
    await fixture.whenStable();
    expect(page.querySelector<HTMLInputElement>('#name')?.disabled).toBeTrue();
    expect(page.querySelector<HTMLInputElement>('#photo')?.disabled).toBeTrue();

    fixture.componentInstance.form.enable();
    fixture.componentInstance.form.reset();
    await fixture.whenStable();
    expect(page.querySelector<HTMLInputElement>('#name')?.value).toBe('');
    expect(page.querySelector('.filename')?.textContent).toBe('');
    expect(page.querySelectorAll('.invalid, .success').length).toBe(0);
  });

  it('previews a photo and releases preview URLs on replacement, reset and destruction', async () => {
    const bytes = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII='),
      (character) => character.charCodeAt(0)
    );
    const file = new File([bytes], 'portrait.png', { type: 'image/png' });
    const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
    const upload = page.querySelector<HTMLElement>('app-file-upload')!;
    const height = upload.getBoundingClientRect().height;
    expect(page.querySelector('.photo-preview img')).toBeNull();

    selectFile(file);
    await fixture.whenStable();
    const image = page.querySelector<HTMLImageElement>('.photo-preview img')!;
    await image.decode();
    const firstUrl = image.src;
    expect(image.naturalWidth).toBe(1);
    expect(upload.getBoundingClientRect().height).toBe(height);
    const preview = page.querySelector<HTMLElement>('.photo-preview')!;
    expect(preview.getBoundingClientRect().right)
      .toBeLessThan(page.querySelector('.upload')!.getBoundingClientRect().left);

    selectFile(new File([bytes], 'replacement.png', { type: 'image/png' }));
    await fixture.whenStable();
    expect(revoke).toHaveBeenCalledWith(firstUrl);
    const secondUrl = page.querySelector<HTMLImageElement>('.photo-preview img')!.src;
    expect(secondUrl).not.toBe(firstUrl);

    fixture.componentInstance.form.reset();
    await fixture.whenStable();
    expect(page.querySelector('.photo-preview img')).toBeNull();
    expect(revoke).toHaveBeenCalledWith(secondUrl);

    selectFile(file);
    await fixture.whenStable();
    const lastUrl = page.querySelector<HTMLImageElement>('.photo-preview img')!.src;
    fixture.destroy();
    expect(revoke).toHaveBeenCalledWith(lastUrl);
  });

  it('does not preview unsupported files and hides an unreadable image', async () => {
    selectFile(new File(['text'], 'photo.gif', { type: 'image/gif' }));
    await fixture.whenStable();
    expect(page.querySelector('.photo-preview img')).toBeNull();

    selectFile(new File(['invalid image'], 'photo.png', { type: 'image/png' }));
    await fixture.whenStable();
    page.querySelector('.photo-preview img')?.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(page.querySelector('.photo-preview img')).toBeNull();
    expect(page.querySelector('.photo-preview lucide-icon')).not.toBeNull();
  });
});
