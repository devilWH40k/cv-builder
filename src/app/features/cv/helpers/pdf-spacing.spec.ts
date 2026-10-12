import pdfMake from 'pdfmake/build/pdfmake';
import { buildCvPdf, pdfRichText } from './cv-pdf-document';
import { CvInfo } from '../services/cv-draft';

describe('PDF technology spacing', () => {
  for (const ending of ['\n\n', '\r\n  ', '<br><br>']) {
    it(`trims trailing description breaks ${JSON.stringify(ending)} inside the last paragraph`, () => {
      const clean = '<ul><li><p><strong>Final responsibility.</strong></p></li></ul>';
      const trailing = `<ul><li><p><strong>Final responsibility.${ending}</strong></p></li></ul>`;
      expect(JSON.stringify(pdfRichText(trailing))).toBe(JSON.stringify(pdfRichText(clean)));
    });
  }

  it('preserves line breaks inside a project description', () => {
    const clean = '<p>First line<br>Second line</p>';
    expect(JSON.stringify(pdfRichText('<p>First line<br>Second line<br>\n</p>')))
      .toBe(JSON.stringify(pdfRichText(clean)));
    expect(JSON.stringify(pdfRichText(clean))).toContain('\\n');
  });

  it('ignores boundary whitespace left after trailing editor paragraphs', () => {
    const clean = '<ul><li><p>Final responsibility.</p></li></ul>';
    expect(JSON.stringify(pdfRichText(clean + '\n<p><br></p>\n'))).toBe(JSON.stringify(pdfRichText(clean)));
  });

  it('ignores formatting whitespace between blocks but preserves spaces between inline words', () => {
    expect(JSON.stringify(pdfRichText('<p>Summary</p>\n  <ul>\n<li>Last item</li>\n</ul>')))
      .toBe(JSON.stringify(pdfRichText('<p>Summary</p><ul><li>Last item</li></ul>')));
    expect(JSON.stringify(pdfRichText('<p><strong>First</strong> <em>second</em></p>'))).toContain('"text":" "');
  });

  for (const technologiesView of ['blocks', 'comma-separated'] as const) {
    for (const technologiesPosition of ['top', 'bottom'] as const) {
      it(`renders consistent ${technologiesView} ${technologiesPosition} PDF spacing with formatted HTML`, async () => {
        const clean = '<p>Summary.</p><ul><li><p>Final responsibility.</p></li></ul>';
        const formatted = '\n<p>Summary.</p>\n<ul>\n<li><p>Final responsibility.</p></li>\n</ul>\n<p><br></p>\n';
        async function positions(description: string): Promise<Map<string, number>> {
          const cv: CvInfo = {
            name: 'Alex', positionTitle: 'Engineer', description: '', photo: null, languages: [], technologies: [],
            structure: { sidebarPosition: 'right', technologiesView, technologiesPosition },
            experiences: [{ company: 'Example', position: '', startDate: '', endDate: '', isCurrent: false,
              technologies: ['Angular'], description }]
          };
          const definition = await buildCvPdf(cv);
          const positions = new Map<string, number>();
          definition.pageBreakBefore = (node) => {
            if (typeof node.text === 'string') positions.set(node.text, node.startPosition.top);
            if (node.image) positions.set('icon', node.startPosition.top);
            return false;
          };
          await pdfMake.createPdf(definition).getBuffer();
          return positions;
        }
        const expected = await positions(clean);
        const actual = await positions(formatted);
        for (const key of ['Summary.', 'Final responsibility.', technologiesView === 'blocks' ? 'icon' : 'Angular']) {
          expect(actual.get(key)).withContext(key).toBeDefined();
          expect(actual.get(key)!).withContext(key).toBeCloseTo(expected.get(key)!, 3);
        }
        if (technologiesView === 'blocks' && technologiesPosition === 'top') {
          expect(actual.get('Summary.')! - actual.get('icon')!).toBeCloseTo(18 + 9, 3);
        }
      });
    }
  }
});
