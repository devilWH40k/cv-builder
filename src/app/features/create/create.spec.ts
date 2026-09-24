import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Create } from './create';
import { CvDraft } from '../cv/cv-draft';

describe('CV form', () => {
  let fixture: ComponentFixture<Create>;
  let page: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Create],
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    }).compileComponents();
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
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

    submit();
    await fixture.whenStable();

    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    expect(page.querySelectorAll('.invalid').length).toBe(3);
    expect(page.querySelector('#name')?.getAttribute('aria-invalid')).toBe('true');
    expect(page.querySelector('#name-error')?.textContent).toContain('Please enter your name.');
    expect(fields.map((field) => field.getBoundingClientRect().height)).toEqual(heights);
  });

  it('shows success marks and opens the preview with the entered data on Create', async () => {
    enterText('name', 'Alex Morgan');
    enterText('position-title', 'Designer');
    enterText('description', 'I design accessible applications.');
    await fixture.whenStable();

    expect(page.querySelectorAll('.success-icon').length).toBe(3);
    expect(page.querySelector('#name')?.getAttribute('aria-invalid')).toBe('false');
    submit();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledOnceWith(['/preview']);
    expect(TestBed.inject(CvDraft).current()).toEqual({
      name: 'Alex Morgan',
      positionTitle: 'Designer',
      description: 'I design accessible applications.',
      photo: null,
      languages: [],
      technologies: []
    });
  });

  it('rejects whitespace-only required fields', async () => {
    enterText('name', '   ');
    enterText('position-title', '   ');
    enterText('description', '\n  ');
    submit();
    await fixture.whenStable();
    expect(page.querySelectorAll('.invalid').length).toBe(3);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('searches tools, groups selected chips in the parent, and synchronizes removal', async () => {
    const selector = page.querySelector<HTMLElement>('app-multi-select')!;
    selector.querySelector('summary')!.click();
    const search = selector.querySelector<HTMLInputElement>('input[type="search"]')!;
    function filter(query: string): void {
      search.value = query;
      search.dispatchEvent(new Event('input'));
    }
    filter('  vUe  ');
    await fixture.whenStable();
    expect(selector.querySelectorAll('.option').length).toBe(1);
    selector.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.technologies.value).toEqual(['Vue']);
    expect(selector.querySelector('.skill-chip')).toBeNull();
    expect(page.querySelector('.skill-group h4')?.textContent).toBe('Frontend');
    expect(page.querySelector('.skill-chip')?.textContent).toContain('Vue');

    filter('mongo');
    await fixture.whenStable();
    selector.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await fixture.whenStable();
    expect(page.querySelectorAll('.skill-group').length).toBe(2);
    expect(fixture.componentInstance.form.controls.technologies.value).toEqual(['Vue', 'MongoDB']);

    page.querySelector<HTMLButtonElement>('[aria-label="Remove MongoDB"]')!.click();
    await fixture.whenStable();
    expect(selector.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBeFalse();
    expect(page.querySelectorAll('.skill-group').length).toBe(1);

    filter('no-such-tool');
    await fixture.whenStable();
    expect(selector.querySelector('[role="status"]')?.textContent).toContain('No matching');
    expect(page.querySelector('.skill-chip')?.textContent).toContain('Vue');

    filter('vue');
    await fixture.whenStable();
    selector.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await fixture.whenStable();
    expect(page.querySelectorAll('.skill-chip').length).toBe(0);
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(selector.querySelector('details')!.open).toBeFalse();
    expect(document.activeElement).toBe(selector.querySelector('summary'));
  });

  it('updates multi-select selection after disabling and resetting the form', async () => {
    const control = fixture.componentInstance.form.controls.technologies;
    control.setValue(['Vue']);
    fixture.componentInstance.form.disable();
    await fixture.whenStable();
    expect(page.querySelector<HTMLInputElement>('app-multi-select input[type="search"]')!.disabled).toBeTrue();
    expect(page.querySelector<HTMLFieldSetElement>('app-multi-select fieldset')!.disabled).toBeTrue();
    fixture.componentInstance.form.enable();
    fixture.componentInstance.form.reset();
    await fixture.whenStable();
    expect(page.querySelectorAll('app-multi-select input:checked').length).toBe(0);
    expect(page.querySelectorAll('.skill-chip').length).toBe(0);
  });

  it('requires both selections in every added row and allows removing an incomplete row', async () => {
    enterText('name', 'Alex Morgan');
    enterText('position-title', 'Designer');
    enterText('description', 'Accessible applications.');
    const add = page.querySelector<HTMLButtonElement>('[aria-label="Add language"]')!;
    add.click();
    await fixture.whenStable();
    expect(page.querySelectorAll('select').length).toBe(2);
    expect(page.querySelectorAll('app-select .invalid').length).toBe(0);

    submit();
    await fixture.whenStable();
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    expect(page.querySelectorAll('app-select .invalid').length).toBe(2);

    const language = page.querySelector<HTMLSelectElement>('#language-0')!;
    language.value = 'Ukrainian';
    language.dispatchEvent(new Event('change'));
    submit();
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();

    const level = page.querySelector<HTMLSelectElement>('#level-0')!;
    level.value = 'Native';
    level.dispatchEvent(new Event('change'));
    add.click();
    await fixture.whenStable();
    expect(page.querySelectorAll('select').length).toBe(4);
    submit();
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();

    page.querySelector<HTMLButtonElement>('[aria-label="Remove language 2"]')!.click();
    await fixture.whenStable();
    submit();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledOnceWith(['/preview']);
    expect(TestBed.inject(CvDraft).current()?.languages).toEqual([
      { language: 'Ukrainian', level: 'Native' }
    ]);
  });

  it('allows removing every language and keeps remaining rows intact', async () => {
    const add = page.querySelector<HTMLButtonElement>('[aria-label="Add language"]')!;
    add.click();
    add.click();
    await fixture.whenStable();
    const languages = fixture.componentInstance.form.controls.languages;
    languages.at(1).setValue({ language: 'English', level: 'B2 — Upper-Intermediate' });
    page.querySelector<HTMLButtonElement>('[aria-label="Remove language 1"]')!.click();
    await fixture.whenStable();
    expect(page.querySelector<HTMLSelectElement>('#language-0')?.value).toBe('English');
    expect(page.querySelector<HTMLSelectElement>('#level-0')?.value).toBe('B2 — Upper-Intermediate');
    page.querySelector<HTMLButtonElement>('[aria-label="Remove language 1"]')!.click();
    await fixture.whenStable();
    expect(page.querySelectorAll('select').length).toBe(0);
    expect(languages.valid).toBeTrue();
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
