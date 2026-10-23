import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Preview } from '../../preview/components/preview/preview';
import { CvDraft, CvInfo } from '../../cv/services/cv-draft';
import { loadDesignFonts } from './design-assets';
import { preparePreview, previewToDesign } from './preview-to-design';
import { parseDesign } from './design-validation';

describe('CV preview conversion', () => {
  it('captures accessible-hidden source text, rich text links, gradients, images and column pages exactly once', async () => {
    TestBed.configureTestingModule({
      imports: [Preview],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    await loadDesignFonts();
    const draft = TestBed.inject(CvDraft);
    const info: CvInfo = {
      name: 'Alex Morgan',
      positionTitle: 'Engineer',
      description: 'Summary first line\nSummary second line',
      contact: { phone: '', email: 'alex@example.com', socials: [] },
      photo: null,
      technologies: ['Angular'],
      languages: [],
      structure: { theme: 'dark-blue', sidebarPosition: 'left', technologiesView: 'blocks' },
      experiences: Array.from({ length: 4 }, (_, index) => ({
        company: `Company ${index + 1}`,
        position: 'Developer',
        startDate: '',
        endDate: '',
        isCurrent: false,
        technologies: ['Angular'],
        description:
          '<p><strong>Built interfaces.</strong> ' +
          'Accessible web applications. '.repeat(35) +
          '</p><ul><li><a href="https://example.com/work">View project</a></li></ul>',
      })),
    };
    draft.save(info);
    const fixture = TestBed.createComponent(Preview);
    fixture.componentRef.setInput('embedded', true);
    fixture.componentRef.setInput('readOnly', true);
    const root: HTMLElement = fixture.nativeElement;
    root.setAttribute('aria-hidden', 'true');
    root.style.cssText = 'position:fixed;left:-20000px;top:0;width:900px;visibility:hidden';
    await fixture.whenStable();
    await preparePreview(root);
    await fixture.whenStable();
    const converted = await previewToDesign(root, 'Alex design', 'source-cv');
    expect(converted.pages.length).toBeGreaterThan(1);
    const objects: { type: string; text?: string; linkUrl?: string; fill?: unknown; designLabel?: string; designTextLinks?: {text: string; linkUrl: string}[] }[] =
      converted.pages.flatMap((page) => JSON.parse(page.scene).objects);
    expect(objects.filter((object) => object.text === 'Alex Morgan').length).toBe(1);
    expect(objects.filter((object) => object.text?.includes('View project')).length).toBe(4);
    expect(objects.filter((object) => object.designTextLinks?.some((link) => link.linkUrl === 'https://example.com/work')).length).toBe(4);
    const summary = objects.filter((object) => object.designLabel === 'Personal summary');
    expect(summary.length).toBe(1);
    expect(summary[0].text).toBe('Summary first line\nSummary second line');
    expect(objects.filter((object) => object.designLabel === 'Project description').every((object) => object.text?.includes('\n'))).toBeTrue();
    expect(objects.some((object) => object.linkUrl === 'mailto:alex@example.com')).toBeTrue();
    expect(objects.some((object) => object.type === 'Image')).toBeTrue();
    const contactIcons = objects.filter((object) => object.designLabel === 'Contact icon');
    expect(contactIcons.length).toBeGreaterThan(0);
    expect(contactIcons.every((object) => object.type === 'Group')).toBeTrue();
    expect(typeof objects.find((object) => object.text === 'Alex Morgan')?.fill).toBe('object');
    expect(objects.some((object) => object.text?.includes('• View project'))).toBeTrue();
    expect(parseDesign(converted).sourceCvId).toBe('source-cv');
    expect(draft.current()).toEqual(info);
  });
});
