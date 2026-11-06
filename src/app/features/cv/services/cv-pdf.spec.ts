import { ToastService } from 'angular-shared-ui/toast';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import pdfMake from 'pdfmake/build/pdfmake';
import { buildCvPdf, pdfRichText } from '../helpers/cv-pdf-document';
import { CvInfo } from './cv-draft';
import { CvPdf } from './cv-pdf';

const cv: CvInfo = {
  name: 'Alex Morgan', positionTitle: 'Developer', description: 'Accessible applications.',
  photo: null, languages: [{ language: 'English', level: 'Native' }], technologies: ['Angular'],
  experiences: [{ company: 'Example', position: 'Engineer', startDate: '2023', endDate: '',
    isCurrent: true, technologies: ['Angular'], description: '<p><strong>Built</strong> applications.</p>' }],
};

describe('PDF export', () => {
  it('exports custom section titles and formatted text without unsafe markup', async () => {
    const definition = await buildCvPdf({ ...cv, customBlocks: [
      { title: 'Achievements', content: '<p><strong>Award winner</strong></p><ul><li>Community work</li></ul><script>alert(1)</script>' },
      { title: 'Interests', content: '<p><em>Hiking</em></p>' }
    ] });
    const content = JSON.stringify(definition.content);
    expect(content).toContain('Achievements');
    expect(content).toContain('Award winner');
    expect(content).toContain('"bold":true');
    expect(content).toContain('Community work');
    expect(content).toContain('Interests');
    expect(content).toContain('"italics":true');
    expect(content).not.toContain('alert(1)');
    expect(content.indexOf('Interests')).toBeGreaterThan(content.indexOf('Achievements'));
    expect((await pdfMake.createPdf(definition).getBuffer()).length).toBeGreaterThan(0);
  });
  it('exports certificate links with short underlined text and skips unsafe links', async () => {
    const definition = await buildCvPdf({ ...cv, certificates: [
      { name: 'Shared certificate', link: 'https://example.com/certificate', date: '2025-06' },
      { name: 'Offline certificate', link: '' },
      { name: 'Undated certificate', link: 'https://example.com/undated-certificate' },
      { name: 'HTTP certificate', link: 'http://example.com/insecure-certificate' },
      { name: 'Unsafe certificate', link: 'javascript:alert(1)' }
    ] });
    const content = JSON.stringify(definition.content);
    expect(content).toContain('Certificates:');
    expect(content).toContain('June 2025');
    expect(content).toContain('"text":"link","link":"https://example.com/certificate","decoration":"underline"');
    expect(content).toContain('"text":"June 2025","fontSize":10,"color":"#475569","width":"auto"');
    expect(content).toContain('"text":"link","link":"https://example.com/undated-certificate","decoration":"underline","color":"#36d4f7","width":"auto"');
    expect(content).toContain('Offline certificate');
    expect(content).not.toContain('javascript:');
    expect(content).not.toContain('http://example.com/insecure-certificate');
    expect((await pdfMake.createPdf(definition).getBuffer()).length).toBeGreaterThan(0);
  });
  it('exports education after experience and supports education without work experience', async () => {
    const education = [{ university: 'Independent University', degree: 'Bachelor', field: 'Cybersecurity',
      startDate: '2018-09', endDate: '2022-06' }];
    for (const experiences of [cv.experiences, []]) {
      const definition = await buildCvPdf({ ...cv, experiences, education });
      const content = JSON.stringify(definition.content);
      expect(content).toContain('Education:');
      expect(content).toContain('Independent University');
      expect(content).toContain('Bachelor | Cybersecurity');
      expect(content).toContain('September 2018 – June 2022');
      if (experiences.length) expect(content.indexOf('Education:')).toBeGreaterThan(content.indexOf('Built'));
      expect((await pdfMake.createPdf(definition).getBuffer()).length).toBeGreaterThan(0);
    }
  });
  it('exports readable contact text and real clickable PDF annotations', async () => {
    const definition = await buildCvPdf({ ...cv, experiences: [], contact: {
      phone: '+380 50 123 4567', email: 'alex@example.com',
      socials: [{ network: 'LinkedIn', value: 'https://www.linkedin.com/in/alex-morgan' }],
    } });
    const content = JSON.stringify(definition.content);
    expect(content).toContain('"text":"+380 50 123 4567"');
    expect(content).not.toContain('Phone:');
    expect(content).toContain('"text":"alex-morgan"');
    expect(content).not.toContain('"text":"https://www.linkedin.com/in/alex-morgan"');
    expect(content.indexOf('mailto:alex@example.com')).toBeLessThan(content.indexOf('Languages:'));
    expect(content).toContain('"svg":');
    expect(content).toContain('mailto:alex@example.com');
    expect(content).toContain('https://www.linkedin.com/in/alex-morgan');
    const bytes = await pdfMake.createPdf(definition).getBuffer();
    const pdf = new TextDecoder('latin1').decode(bytes);
    expect(pdf).toContain('/Subtype /Link');
    expect(pdf).toContain('mailto:alex@example.com');
    expect(pdf).toContain('https://www.linkedin.com/in/alex-morgan');
  });
  for (const technologiesView of ['blocks', 'comma-separated'] as const) {
    for (const technologiesPosition of ['top', 'bottom'] as const) {
      it(`exports ${technologiesView} technologies at the ${technologiesPosition}`, async () => {
        const definition = await buildCvPdf({ ...cv,
          structure: { sidebarPosition: 'right', technologiesView, technologiesPosition }
        });
        const content = JSON.stringify(definition.content);
        const technologyIndex = content.indexOf(technologiesView === 'blocks' ? '"image":' : '"text":"Angular"');
        const descriptionIndex = content.indexOf('Built');
        expect(technologyIndex).toBeGreaterThan(-1);
        expect(descriptionIndex).toBeGreaterThan(-1);
        expect(technologyIndex < descriptionIndex).toBe(technologiesPosition === 'top');
      });
    }
  }
  for (const sidebarTechnologiesView of ['list', 'blocks'] as const) {
    it(`exports custom icons in experience blocks and the sidebar ${sidebarTechnologiesView}`, async () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 96;
      canvas.getContext('2d')!.fillRect(0, 0, 96, 96);
      const icon = canvas.toDataURL('image/png');
      const definition = await buildCvPdf({ ...cv,
        technologies: ['SDK'], customTechnologyIcons: { SDK: icon },
        experiences: [{ ...cv.experiences[0], technologies: ['SDK'], customTechnologyIcons: { SDK: icon } },
          { ...cv.experiences[0], technologies: ['SDK', 'No icon'], customTechnologyIcons: { SDK: icon } }],
        structure: { sidebarPosition: 'right', technologiesView: 'blocks', sidebarTechnologiesView }
      });
      const content = JSON.stringify(definition.content);
      expect(content).toContain('SDK, No icon');
      expect(content).toContain('data:image/png;base64,');
      const bytes = await pdfMake.createPdf(definition).getBuffer();
      expect(new TextDecoder('latin1').decode(bytes)).toContain('/Subtype /Image');
    });
  }
  it('uses comma-separated names for custom experience technologies even in blocks mode', async () => {
    const decode = spyOn(HTMLImageElement.prototype, 'decode').and.rejectWith(new Error('Unexpected icon'));
    const definition = await buildCvPdf({ ...cv,
      technologies: ['Internal SDK'],
      experiences: [{ ...cv.experiences[0], technologies: ['Angular', 'Internal SDK'] }],
      structure: { sidebarPosition: 'right', technologiesView: 'blocks' }
    });
    expect(JSON.stringify(definition.content)).toContain('Angular, Internal SDK');
    expect(JSON.stringify(definition.content)).not.toContain('"image":');
    expect(decode).not.toHaveBeenCalled();
  });
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
        structure: { photoSizeMm: 52, theme, sidebarPosition: 'left', technologiesView: 'blocks', sidebarTechnologiesView: 'blocks' },
      });
      const content = JSON.stringify(definition.content);
      expect(content.indexOf('Languages:')).toBeLessThan(content.indexOf('Experience:'));
      expect(content).toContain('data:image/png;base64,');
      expect(content).toContain('"width":' + (52 * 72 / 25.4));
      expect(content).toContain('"height":' + (52 * 72 / 25.4));
      expect((await pdfMake.createPdf(definition).getBuffer()).length).toBeGreaterThan(1000);
    });
  }

  it('omits a hidden photo from the PDF without decoding it', async () => {
    const definition = await buildCvPdf({ ...cv,
      photo: new File(['invalid'], 'photo.png', { type: 'image/png' }),
      structure: { showPhoto: false, sidebarPosition: 'right', technologiesView: 'comma-separated' }
    });
    expect(JSON.stringify(definition.content)).not.toContain('"image":');
    expect(JSON.stringify(definition.content)).toContain(cv.name);
  });

  it('shows success only after starting the download and ignores duplicate requests while exporting', async () => {
    const service = TestBed.inject(CvPdf);
    const toast = spyOn(TestBed.inject(ToastService), 'show');
    const pdf = pdfMake.createPdf({ content: [] });
    let finishDownload!: () => void;
    const completion = new Promise<void>((resolve) => { finishDownload = resolve; });
    let downloadStarted!: () => void;
    const started = new Promise<void>((resolve) => { downloadStarted = resolve; });
    const download = spyOn(pdf, 'download').and.callFake(() => {
      downloadStarted();
      return completion;
    });
    spyOn(pdfMake, 'createPdf').and.returnValue(pdf);

    const exporting = service.download({ ...cv, technologies: [], experiences: [] });
    await started;
    expect(service.exporting()).toBeTrue();
    expect(toast).not.toHaveBeenCalled();
    await service.download(cv);
    expect(download).toHaveBeenCalledOnceWith('Alex Morgan-CV.pdf');
    finishDownload();
    await exporting;
    expect(toast).toHaveBeenCalledOnceWith('success', 'Your PDF download has started.');
    expect(service.exporting()).toBeFalse();
  });

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
