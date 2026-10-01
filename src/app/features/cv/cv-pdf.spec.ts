import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import pdfMake from 'pdfmake/build/pdfmake';
import { buildCvPdf, pdfRichText } from './cv-pdf-document';
import { CvInfo } from './cv-draft';
import { CvPdf } from './cv-pdf';
import { ToastService } from '../../shared/ui/toast/toast.service';

const cv: CvInfo = {
  name: 'Alex Morgan', positionTitle: 'Developer', description: 'Accessible applications.',
  photo: null, languages: [{ language: 'English', level: 'Native' }], technologies: ['Angular'],
  experiences: [{ company: 'Example', position: 'Engineer', startDate: '2023', endDate: '',
    isCurrent: true, technologies: ['Angular'], description: '<p><strong>Built</strong> applications.</p>' }],
};

describe('PDF export', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));
  it('retains rich text and links without accepting embedded PDF instructions', () => {
    const content = JSON.stringify(pdfRichText('<p data-pdfmake=\'{"pageBreak":"before"}\'><strong>Bold</strong> <em>Italic</em> <u>Underlined</u></p><ul><li>Item</li></ul><a href="https://example.com">Link</a><a href="javascript:alert(1)">Unsafe</a>'));
    expect(content).toContain('"bold":true');
    expect(content).toContain('"italics":true');
    expect(content).toContain('underline');
    expect(content).toContain('"ul":');
    expect(content).toContain('https://example.com');
    expect(content).not.toContain('javascript:');
    expect(content).not.toContain('pageBreak');
  });

  it('ignores trailing editor paragraphs after a responsibility list', () => {
    const list = '<ul><li><p>Final responsibility.</p></li></ul>';
    expect(JSON.stringify(pdfRichText(list + '<p><br></p><p>&nbsp;</p>'))).toBe(JSON.stringify(pdfRichText(list)));
    expect(JSON.stringify(pdfRichText(list))).toContain('Final responsibility.');
  });

  it('preserves paragraph spacing inside experience descriptions', () => {
    const paragraphs = '<p>First paragraph.</p><p><br></p><p>Last paragraph.</p>';
    expect(JSON.stringify(pdfRichText(paragraphs))).not.toBe(JSON.stringify(pdfRichText('<p>First paragraph.</p><p>Last paragraph.</p>')));
  });
  it('generates a real multipage PDF with long experience content', async () => {
    const definition = await buildCvPdf({ ...cv,
      structure: { theme: 'basic', sidebarPosition: 'right', technologiesView: 'comma-separated' },
      experiences: Array.from({ length: 35 }, (_, index) => ({ ...cv.experiences[0], company: `Company ${index}` })),
    });
    const bytes = await pdfMake.createPdf(definition).getBuffer();
    const pdf = new TextDecoder('latin1').decode(bytes);
    expect(pdf.startsWith('%PDF-')).toBeTrue();
    expect((pdf.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
    expect(JSON.stringify(definition.content)).toContain('Company 34');
    expect(JSON.stringify(definition.content)).toContain('Present');
  });

  for (const theme of ['basic', 'dark', 'dark-blue'] as const) {
    it(`exports ${theme} with left sidebar, photo, and technology blocks`, async () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 4;
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject()));
      const definition = await buildCvPdf({ ...cv, photo: new File([blob], 'photo.png', { type: 'image/png' }),
        structure: { theme, sidebarPosition: 'left', technologiesView: 'blocks', sidebarTechnologiesView: 'blocks' },
      });
      const content = JSON.stringify(definition.content);
      expect(content.indexOf('Languages:')).toBeLessThan(content.indexOf('Experience:'));
      expect(content).toContain('data:image/png;base64,');
      expect((await pdfMake.createPdf(definition).getBuffer()).length).toBeGreaterThan(1000);
    });
  }

  it('reports export failures and restores the ability to retry', async () => {
    const service = TestBed.inject(CvPdf);
    const toast = spyOn(TestBed.inject(ToastService), 'show');
    spyOn(HTMLImageElement.prototype, 'decode').and.rejectWith(new Error('Invalid photo'));
    const failedCv = { ...cv, photo: new File(['invalid'], 'photo.png', { type: 'image/png' }) };
    const first = service.download(failedCv);
    expect(service.exporting()).toBeTrue();
    await service.download(failedCv);
    await first;
    expect(toast).toHaveBeenCalledOnceWith('danger', 'Your PDF could not be exported. Please try again.');
    expect(service.exporting()).toBeFalse();
    await service.download(failedCv);
    expect(toast).toHaveBeenCalledTimes(2);
  });
});
