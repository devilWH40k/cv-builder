import pdfMake from 'pdfmake/build/pdfmake';
import fonts from 'pdfmake/build/vfs_fonts';
import type { Content } from 'pdfmake/interfaces';
import { pdfTechnologyBlocks } from './cv-pdf-technology-blocks';

function rowSvg(row: Content): SVGSVGElement {
  if (typeof row !== 'object' || row === null || !('svg' in row) || typeof row.svg !== 'string') {
    throw new Error('Expected a vector technology row');
  }
  const document = new DOMParser().parseFromString(row.svg, 'image/svg+xml');
  if (document.querySelector('parsererror')) throw new Error('Invalid SVG');
  return document.querySelector('svg')!;
}

describe('PDF technology blocks', () => {
  beforeAll(() => pdfMake.addVirtualFileSystem(fonts));

  it('renders independent rounded cards with gaps and no empty final card', async () => {
    const rows = await pdfTechnologyBlocks(['JavaScript', 'Angular Material', 'Scrum'], 154, '#36d4f7', true);
    expect(rows.length).toBe(2);
    const first = rowSvg(rows[0]);
    const cards = first.querySelectorAll('rect');
    expect(cards.length).toBe(2);
    expect(Number(cards[0].getAttribute('rx'))).toBeGreaterThan(0);
    expect(Number(cards[1].getAttribute('x'))).toBeGreaterThan(
      Number(cards[0].getAttribute('x')) + Number(cards[0].getAttribute('width')),
    );
    expect(cards[0].getAttribute('height')).toBe(cards[1].getAttribute('height'));
    expect(cards[0].getAttribute('fill-opacity')).toBe('0.04');
    expect(first.querySelectorAll('text').length).toBe(3);
    expect(rowSvg(rows[1]).querySelectorAll('rect').length).toBe(1);
    expect(rowSvg(rows[1]).textContent).toBe('Scrum');
    const buffer = await pdfMake.createPdf({ content: rows }).getBuffer();
    expect(new TextDecoder('latin1').decode(buffer).startsWith('%PDF-')).toBeTrue();
  });

  it('wraps long labels and escapes markup while retaining text', async () => {
    const label = 'AnExtremelyLongTechnologyName';
    const rows = await pdfTechnologyBlocks([label, 'A&B <Tool>'], 154, '#000000', false);
    const svg = rowSvg(rows[0]);
    expect(svg.querySelector('rect')!.getAttribute('fill-opacity')).toBe('0');
    expect(svg.textContent).toContain(label);
    expect(svg.textContent).toContain('A&B <Tool>');
    expect(svg.querySelectorAll('text').length).toBeGreaterThan(2);
    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(30);
    expect((await pdfMake.createPdf({ content: rows }).getBuffer()).length).toBeGreaterThan(1000);
  });

  it('omits an empty technology grid', async () => {
    expect((await pdfTechnologyBlocks([], 154, '#000000', false)).length).toBe(0);
  });

  it('embeds a custom icon into its card at a fixed size in the actual PDF', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    canvas.getContext('2d')!.fillRect(0, 0, 96, 96);
    const icon = canvas.toDataURL('image/png');
    const rows = await pdfTechnologyBlocks(['SDK', 'Other'], 154, '#000000', false, { SDK: icon });
    const image = rowSvg(rows[0]).querySelector('image')!;
    expect(image.getAttribute('href')).toBe(icon);
    expect(image.getAttribute('width')).toBe('15');
    expect(image.getAttribute('height')).toBe('15');
    const bytes = await pdfMake.createPdf({ content: rows }).getBuffer();
    expect(new TextDecoder('latin1').decode(bytes)).toContain('/Subtype /Image');
  });
});
