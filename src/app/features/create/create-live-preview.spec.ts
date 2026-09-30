import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Create } from './create';
import { CvDraft } from '../cv/cv-draft';

describe('Experience description live preview', () => {
  it('updates while typing without another field change and preserves editor synchronization', async () => {
    TestBed.configureTestingModule({
      imports: [Create],
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    });
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('[aria-label="Add experience"]')!.click();
    await fixture.whenStable();
    const control = fixture.componentInstance.form.controls.experiences.at(0).controls.description;
    const editor = page.querySelector<HTMLElement>('[contenteditable="true"]')!;
    const preview = page.querySelector<HTMLElement>('.project-description')!;
    editor.focus();

    async function typeText(text: string): Promise<void> {
      document.execCommand('insertText', false, text);
      // Allow ProseMirror's DOM observer to process native contenteditable mutations.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await fixture.whenStable();
    }

    await typeText('Built');
    expect(preview.textContent).toBe('Built');
    expect(TestBed.inject(CvDraft).current()?.experiences[0].description).toBe(control.value);
    expect(control.dirty).toBeTrue();

    await typeText(' accessible forms.');
    expect(editor.textContent).toBe('Built accessible forms.');
    expect(preview.textContent).toBe('Built accessible forms.');

    page.querySelector<HTMLButtonElement>('[aria-label="Undo"]')!.click();
    await fixture.whenStable();
    expect(preview.textContent).toBe(editor.textContent);
    expect(preview.textContent).not.toBe('Built accessible forms.');
    page.querySelector<HTMLButtonElement>('[aria-label="Redo"]')!.click();
    await fixture.whenStable();
    expect(preview.textContent).toBe('Built accessible forms.');

    control.setValue('<p>Restored <strong>description</strong>.</p>');
    await fixture.whenStable();
    expect(editor.querySelector('strong')?.textContent).toBe('description');
    expect(preview.querySelector('strong')?.textContent).toBe('description');

    control.reset();
    await fixture.whenStable();
    expect(editor.textContent).toBe('');
    expect(preview.textContent).toBe('');
    expect(control.pristine).toBeTrue();
  });
});
