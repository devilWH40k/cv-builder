import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AngularTiptapEditorComponent } from '@flogeez/angular-tiptap-editor';
import { CvDraft } from '../../../cv/services/cv-draft';
import { CvPdf } from '../../../cv/services/cv-pdf';
import { createCustomBlockForm } from '../../helpers/cv-form';
import { Create } from './create';

describe('CV custom blocks', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [Create],
    providers: [provideZonelessChangeDetection(), provideRouter([])]
  }));

  it('requires a nonblank title and permits empty content', () => {
    const form = createCustomBlockForm();
    expect(form.valid).toBeFalse();
    form.controls.title.setValue('   ');
    expect(form.valid).toBeFalse();
    form.controls.title.setValue('Interests');
    expect(form.valid).toBeTrue();
  });

  it('adds multiple blocks, previews rich text, restores the draft, and removes the selected block', async () => {
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    const add = page.querySelector<HTMLButtonElement>('[aria-label="Add custom block"] button')!;
    add.click();
    add.click();
    const blocks = [
      { title: 'Achievements', content: '<p><strong>Award winner</strong></p><ul><li><p>Open source</p></li></ul><p></p>' },
      { title: 'Interests', content: '<p><em>Hiking</em></p>' }
    ];
    fixture.componentInstance.form.controls.customBlocks.setValue(blocks);
    await fixture.whenStable();
    expect(TestBed.inject(CvDraft).current()?.customBlocks).toEqual(blocks);
    const preview = page.querySelectorAll('.cv-custom-block');
    expect(preview.length).toBe(2);
    expect(preview[0].querySelector('h3')?.textContent).toBe('Achievements');
    expect(preview[0].querySelector('strong')?.textContent).toBe('Award winner');
    expect(preview[0].querySelector('li')?.textContent).toBe('Open source');
    expect(preview[1].querySelector('em')?.textContent).toBe('Hiking');
    fixture.destroy();

    const restored = TestBed.createComponent(Create);
    await restored.whenStable();
    expect(restored.componentInstance.form.controls.customBlocks.getRawValue()).toEqual(blocks);
    const restoredPage: HTMLElement = restored.nativeElement;
    expect(restoredPage.querySelector<HTMLInputElement>('#custom-block-title-0')?.value).toBe('Achievements');
    expect(restoredPage.querySelector('app-custom-block-entry .ProseMirror strong')?.textContent).toBe('Award winner');
    restoredPage.querySelector<HTMLButtonElement>('[aria-label="Remove custom block 1"]')!.click();
    await restored.whenStable();
    expect(TestBed.inject(CvDraft).current()?.customBlocks).toEqual([blocks[1]]);
    expect(restoredPage.querySelectorAll('.cv-custom-block').length).toBe(1);
    restoredPage.querySelector<HTMLButtonElement>('[aria-label="Remove custom block 1"]')!.click();
    await restored.whenStable();
    expect(restoredPage.querySelector('.cv-custom-block')).toBeNull();
  });

  it('syncs rich text editor changes and toolbar formatting to the form and preview', async () => {
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    document.body.appendChild(page);
    try {
      await fixture.whenStable();
      page.querySelector<HTMLButtonElement>('[aria-label="Add custom block"] button')!.click();
      await fixture.whenStable();
      if (page.querySelector<HTMLElement>('#custom-blocks-panel')!.hidden) {
        page.querySelector<HTMLButtonElement>('#custom-blocks-panel-heading')!.click();
        await fixture.whenStable();
      }
      const editor = fixture.debugElement.query(By.directive(AngularTiptapEditorComponent))
        .injector.get(AngularTiptapEditorComponent).editor()!;
      editor.commands.setContent('<p>Community work</p>');
      editor.commands.selectAll();
      page.querySelector<HTMLButtonElement>('app-custom-block-entry [aria-label="Bold"]')!.click();
      await fixture.whenStable();
      const form = fixture.componentInstance.form.controls.customBlocks.at(0);
      expect(form.controls.content.value).toContain('<strong>Community work</strong>');
      expect(form.controls.content.dirty).toBeTrue();
      expect(page.querySelector('.cv-custom-block strong')?.textContent).toBe('Community work');
    } finally {
      fixture.destroy();
      page.remove();
    }
  });

  it('opens the invalid panel before export and exports valid blocks', async () => {
    const download = spyOn(TestBed.inject(CvPdf), 'download').and.resolveTo();
    spyOn(HTMLElement.prototype, 'scrollIntoView');
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    fixture.componentInstance.form.patchValue({ name: 'Alex', positionTitle: 'Engineer', description: 'Summary' });
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('[aria-label="Add custom block"] button')!.click();
    await fixture.whenStable();
    const panel = page.querySelector<HTMLElement>('#custom-blocks-panel')!;
    if (!panel.hidden) page.querySelector<HTMLButtonElement>('#custom-blocks-panel-heading')!.click();
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('.actions > ui-button button')!.click();
    await fixture.whenStable();
    expect(panel.hidden).toBeFalse();
    expect(page.querySelector('#custom-block-title-0-error')?.textContent).toContain('Please enter a title.');
    expect(download).not.toHaveBeenCalled();
    const block = { title: 'Interests', content: '<p>Hiking</p>' };
    fixture.componentInstance.form.controls.customBlocks.at(0).setValue(block);
    page.querySelector<HTMLButtonElement>('.actions > ui-button button')!.click();
    await fixture.whenStable();
    expect(download).toHaveBeenCalledWith(jasmine.objectContaining({ customBlocks: [block] }));
  });
});
