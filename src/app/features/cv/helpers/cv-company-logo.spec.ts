import type { ContentColumns } from 'pdfmake/interfaces';
import { buildCvPdf } from './cv-pdf-document';
import { CvInfo } from '../services/cv-draft';

describe('Company logo PDF export', () => {
  it('adds the logo to the right of the header without a portrait and releases its URL', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 80;
    canvas.getContext('2d')!.fillRect(0, 0, 200, 80);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'));
    const companyLogo = new File(['<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><rect width="200" height="80" fill="red"/></svg>'], 'company.svg', { type: 'image/svg+xml' });
    const cv: CvInfo = { name: 'Alex', positionTitle: 'Developer', description: 'Summary',
      photo: null, companyLogo, languages: [], technologies: [], experiences: [] };
    const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
    const pdf = await buildCvPdf(cv);
    const header = (pdf.content as ContentColumns[])[0];
    expect(header.columns.length).toBe(2);
    const logo = header.columns[1];
    if (typeof logo !== 'object' || !('image' in logo)) throw new Error('Expected logo image');
    expect(logo.image).toMatch(/^data:image\/png;base64,/);
    expect(logo.width).toBe(18 * 72 / 25.4);
    expect(revoke).toHaveBeenCalled();
    const plain = await buildCvPdf({ ...cv, companyLogo: null });
    expect((plain.content as ContentColumns[])[0].columns.length).toBe(1);
  });
});
