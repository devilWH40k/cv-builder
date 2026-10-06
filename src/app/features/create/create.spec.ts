import { CvPdf } from '../cv/cv-pdf';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Create } from './create';
import { ExperiencesDialog } from './experiences-dialog/experiences-dialog';
import { SavedCvs } from '../cv/saved-cvs';
import { By } from '@angular/platform-browser';
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
    spyOn(TestBed.inject(CvPdf), 'download').and.resolveTo();
    fixture = TestBed.createComponent(Create);
    page = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  function submit(): void {
    page.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  it('adds general technologies to Custom and prevents blank or duplicate entries', async () => {
    for (const name of ['  Internal SDK  ', 'internal sdk', ' vue ', '   ']) {
      page.querySelector<HTMLButtonElement>('#technologies')!.closest('app-multi-select')!.querySelector<HTMLButtonElement>('.add-custom')!.click();
      await fixture.whenStable();
      const input = document.querySelector<HTMLInputElement>('#technologies-custom-name')!;
      input.value = name;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      document.querySelector<HTMLButtonElement>('dialog app-button button')!.click();
      await fixture.whenStable();
      if (!name.trim()) {
        expect(document.querySelector<HTMLButtonElement>('dialog app-button button')!.disabled).toBeTrue();
        document.querySelector<HTMLButtonElement>('dialog .cancel')!.click();
        await fixture.whenStable();
      }
    }
    expect(fixture.componentInstance.form.controls.technologies.value).toEqual(['Internal SDK', 'Vue']);
    const custom = Array.from(page.querySelectorAll('.skill-group'))
      .find((group) => group.querySelector('h4')?.textContent?.trim() === 'Custom');
    expect(custom?.textContent).toContain('Internal SDK');
    custom!.querySelector<HTMLButtonElement>('[aria-label="Remove Internal SDK"]')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.technologies.value).toEqual(['Vue']);
  });

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

  it('loads a library experience once and retains its ID in the draft', async () => {
    spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.resolveTo([]);
    page.querySelector<HTMLButtonElement>('[aria-label="Load experiences"] button')!.click();
    await fixture.whenStable();
    const dialog = fixture.debugElement.query(By.directive(ExperiencesDialog)).componentInstance as ExperiencesDialog;
    const record = { id: 'library-1', updatedAt: 1, experience: {
      company: 'Example', position: '', startDate: '', endDate: '', isCurrent: false,
      technologies: [], description: ''
    } };
    dialog.applied.emit([record, record]);
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.experiences.length).toBe(1);
    expect(TestBed.inject(CvDraft).current()?.experiences[0].savedExperienceId).toBe(record.id);
    page.querySelector<HTMLButtonElement>('[aria-label="Load experiences"] button')!.click();
    await fixture.whenStable();
    const reopened = fixture.debugElement.query(By.directive(ExperiencesDialog)).componentInstance as ExperiencesDialog;
    expect(reopened.linkedIds()).toEqual([record.id]);
    reopened.applied.emit([record]);
    expect(fixture.componentInstance.form.controls.experiences.length).toBe(1);
  });

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

  it('shows success marks, updates the live preview, and exports valid data', async () => {
    enterText('name', 'Alex Morgan');
    enterText('position-title', 'Designer');
    enterText('description', 'I design accessible applications.');
    await fixture.whenStable();

    expect(page.querySelectorAll('.success-icon').length).toBe(3);
    expect(page.querySelector('#name')?.getAttribute('aria-invalid')).toBe('false');
    submit();
    expect(TestBed.inject(CvPdf).download).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(CvDraft).current()).toEqual({
      customTechnologyIcons: {},
      name: 'Alex Morgan',
      positionTitle: 'Designer',
      description: 'I design accessible applications.',
      photo: null,
      languages: [],
      experiences: [],
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
    expect(TestBed.inject(CvPdf).download).toHaveBeenCalledTimes(1);
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
    it(`previews ${name} before changing form data`, async () => {
      const file = new File(['image'], name, { type });
      selectFile(file);
      await fixture.whenStable();
      expect(fixture.componentInstance.form.controls.photo.value).toBeNull();
      expect(fixture.componentInstance.form.controls.photo.valid).toBeTrue();
      expect(document.querySelector('.dialog-overlay dialog.photo-preview-dialog')).not.toBeNull();
      expect(page.querySelector('.filename')?.textContent).toBe('');
    });
  }

  it('keeps the previous photo on Cancel and commits only the applied crop', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
    const oldPhoto = new File([blob!], 'old.png', { type: 'image/png' });
    const newPhoto = new File([blob!], 'new.png', { type: 'image/png' });
    const control = fixture.componentInstance.form.controls.photo;
    control.setValue(oldPhoto);
    selectFile(newPhoto);
    await fixture.whenStable();
    expect(control.value).toBe(oldPhoto);
    expect(control.pristine).toBeTrue();
    document.querySelector<HTMLButtonElement>('.dialog-overlay .cancel')!.click();
    await fixture.whenStable();
    expect(control.value).toBe(oldPhoto);
    expect(page.querySelector('app-photo-preview')).toBeNull();

    selectFile(newPhoto);
    await fixture.whenStable();
    const image = document.querySelector<HTMLImageElement>('.dialog-overlay .source-photo')!;
    await image.decode();
    image.dispatchEvent(new Event('load'));
    await fixture.whenStable();
    const changed = new Promise<File | null>((resolve) => {
      const subscription = control.valueChanges.subscribe((value) => {
        subscription.unsubscribe();
        resolve(value);
      });
    });
    document.querySelector<HTMLButtonElement>('.dialog-overlay app-button button')!.click();
    const cropped = await changed;
    await fixture.whenStable();
    expect(cropped?.name).toBe('new.png');
    expect(cropped).not.toBe(newPhoto);
    expect(control.dirty).toBeTrue();
    expect(control.touched).toBeTrue();
    expect(page.querySelector('app-photo-preview')).toBeNull();
    const bitmap = await createImageBitmap(cropped!);
    expect(bitmap.width).toBe(80);
    expect(bitmap.height).toBe(80);
    bitmap.close();
  });
  it('rejects unsupported files without shifting the upload and recovers on replacement', async () => {
    const upload = page.querySelector<HTMLElement>('app-file-upload')!;
    const height = upload.getBoundingClientRect().height;
    selectFile(new File(['image'], 'photo.gif', { type: 'image/gif' }));
    await fixture.whenStable();
    expect(page.querySelector('#photo-error')?.textContent).toContain('JPG, JPEG or PNG');
    expect(page.querySelector('#photo')?.getAttribute('aria-invalid')).toBe('true');
    expect(upload.getBoundingClientRect().height).toBe(height);

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 100;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
    selectFile(new File([blob!], 'photo.png', { type: 'image/png' }));
    await fixture.whenStable();
    const image = document.querySelector<HTMLImageElement>('.dialog-overlay .source-photo')!;
    await image.decode();
    image.dispatchEvent(new Event('load'));
    await fixture.whenStable();
    const applied = new Promise<void>((resolve) => {
      const subscription = fixture.componentInstance.form.controls.photo.valueChanges.subscribe(() => {
        subscription.unsubscribe();
        resolve();
      });
    });
    document.querySelector<HTMLButtonElement>('.dialog-overlay app-button button')!.click();
    await applied;
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

    fixture.componentInstance.form.controls.photo.setValue(file);
    await fixture.whenStable();
    const image = page.querySelector<HTMLImageElement>('.photo-preview img')!;
    await image.decode();
    const firstUrl = image.src;
    expect(image.naturalWidth).toBe(1);
    expect(upload.getBoundingClientRect().height).toBe(height);
    const preview = page.querySelector<HTMLElement>('.photo-preview')!;
    expect(preview.getBoundingClientRect().right)
      .toBeLessThan(page.querySelector('.upload')!.getBoundingClientRect().left);

    fixture.componentInstance.form.controls.photo.setValue(new File([bytes], 'replacement.png', { type: 'image/png' }));
    await fixture.whenStable();
    expect(revoke).toHaveBeenCalledWith(firstUrl);
    const secondUrl = page.querySelector<HTMLImageElement>('.photo-preview img')!.src;
    expect(secondUrl).not.toBe(firstUrl);

    fixture.componentInstance.form.reset();
    await fixture.whenStable();
    expect(page.querySelector('.photo-preview img')).toBeNull();
    expect(revoke).toHaveBeenCalledWith(secondUrl);

    fixture.componentInstance.form.controls.photo.setValue(file);
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
  it('adds experience, validates company, updates rich text, and removes incomplete entries', async () => {
    enterText('name', 'Alex Morgan');
    enterText('position-title', 'Developer');
    enterText('description', 'Building applications.');
    const add = page.querySelector<HTMLButtonElement>('[aria-label="Add experience"]')!;
    add.click();
    await fixture.whenStable();
    submit();
    await fixture.whenStable();
    expect(page.querySelector('#company-0-error')?.textContent).toContain('Please enter a company.');
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    enterText('company-0', 'FINBIT');
    const editor = page.querySelector<HTMLElement>('[contenteditable="true"]')!;
    expect(editor).not.toBeNull();
    editor.focus();
    page.querySelector<HTMLButtonElement>('[aria-label="Bold"]')!.click();
    document.execCommand('insertText', false, 'Built accessible forms.');
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.experiences.at(0).controls.description.value)
      .toContain('<strong>Built accessible forms.</strong>');
    add.click();
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('[aria-label="Remove experience 2"]')!.click();
    await fixture.whenStable();
    submit();
    expect(TestBed.inject(CvPdf).download).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(CvDraft).current()?.experiences[0].company).toBe('FINBIT');
  });

});

describe('Combined CV editor', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [Create],
    providers: [provideZonelessChangeDetection(), provideRouter([])]
  }));

  it('updates preview while invalid and only exports when the form is valid', async () => {
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    const download = spyOn(TestBed.inject(CvPdf), 'download').and.resolveTo();
    await fixture.whenStable();
    const exportButton = page.querySelector<HTMLButtonElement>('.actions > app-button button')!;
    expect(exportButton.disabled).toBeFalse();
    fixture.componentInstance.form.controls.name.setValue('Live name');
    await fixture.whenStable();
    expect(page.querySelector('.cv-info h2')?.textContent).toBe('Live name');
    expect(exportButton.disabled).toBeFalse();
    exportButton.click();
    expect(download).not.toHaveBeenCalled();
    fixture.componentInstance.form.patchValue({ positionTitle: 'Developer', description: 'Summary' });
    await fixture.whenStable();
    expect(exportButton.disabled).toBeFalse();
    page.querySelector<HTMLButtonElement>('[aria-label="Add language"]')!.click();
    await fixture.whenStable();
    expect(exportButton.disabled).toBeFalse();
    page.querySelector<HTMLButtonElement>('[aria-label="Remove language 1"]')!.click();
    await fixture.whenStable();
    expect(exportButton.disabled).toBeFalse();
    exportButton.click();
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('switches tabs by keyboard, retains form edits, and previews structure changes', async () => {
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    fixture.componentInstance.form.controls.name.setValue('Retained name');
    const tabs = page.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await fixture.whenStable();
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);
    expect(page.querySelector<HTMLElement>('#info-panel')!.hidden).toBeTrue();
    page.querySelector<HTMLInputElement>('input[name="cv-theme"][value="dark"]')!.click();
    await fixture.whenStable();
    expect(page.querySelector('.cv-document.theme-dark')).not.toBeNull();
    tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await fixture.whenStable();
    expect(page.querySelector<HTMLInputElement>('#name')!.value).toBe('Retained name');
    expect(page.querySelector<HTMLElement>('#structure-panel')!.hidden).toBeTrue();
    expect(TestBed.inject(CvDraft).current()?.structure?.theme).toBe('dark');
  });
});
