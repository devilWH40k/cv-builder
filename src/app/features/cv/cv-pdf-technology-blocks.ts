import fonts from 'pdfmake/build/vfs_fonts';
import type { Content } from 'pdfmake/interfaces';

// Match the preview's 3mm gap, 2mm padding, 9mm minimum height and 8px radius.
const GAP = 3 * 72 / 25.4;
const PADDING = 2 * 72 / 25.4;
const MIN_HEIGHT = 9 * 72 / 25.4;
const FONT_SIZE = 9;
const LINE_HEIGHT = FONT_SIZE * 1.5;
const BORDER = 0.75;

function wrapLabel(label: string, context: CanvasRenderingContext2D, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of label.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    for (const character of word) {
      if (line && context.measureText(line + character).width > width) {
        lines.push(line);
        line = '';
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function pdfTechnologyBlocks(
  technologies: readonly string[], width: number, color: string, tinted: boolean,
): Promise<Content[]> {
  if (!technologies.length) return [];
  // Measure with the same bundled font that pdfmake embeds, rather than a system fallback.
  const bytes = Uint8Array.from(atob(fonts['Roboto-Regular.ttf']), (character) => character.charCodeAt(0));
  const font = await new FontFace('CvPdfBlockMeasure', bytes).load();
  document.fonts.add(font);
  try {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) throw new Error('Text measurement is unavailable');
    context.font = `${FONT_SIZE}px CvPdfBlockMeasure`;
    const cardWidth = (width - GAP) / 2;
    const labels = technologies.map((label) => wrapLabel(label, context, cardWidth - 2 * (PADDING + BORDER)));
    const rows: Content[] = [];
    for (let index = 0; index < labels.length; index += 2) {
      const pair = labels.slice(index, index + 2);
      const height = Math.max(MIN_HEIGHT, Math.max(...pair.map((lines) => lines.length)) * LINE_HEIGHT + 2 * (PADDING + BORDER));
      const cards = pair.map((lines, column) => {
        const x = column * (cardWidth + GAP);
        const metrics = context.measureText('Mg');
        const ascent = metrics.fontBoundingBoxAscent;
        const descent = metrics.fontBoundingBoxDescent;
        const firstBaseline = (height - lines.length * LINE_HEIGHT) / 2
          + (LINE_HEIGHT + ascent - descent) / 2;
        const text = lines.map((line, row) =>
          `<text x="${x + cardWidth / 2}" y="${firstBaseline + row * LINE_HEIGHT}" text-anchor="middle" font-family="Roboto" font-size="${FONT_SIZE}" fill="${color}">${escapeXml(line)}</text>`,
        ).join('');
        return `<rect x="${x + BORDER / 2}" y="${BORDER / 2}" width="${cardWidth - BORDER}" height="${height - BORDER}" rx="6" stroke="${color}" stroke-width="${BORDER}" fill="${color}" fill-opacity="${tinted ? 0.04 : 0}"/>${text}`;
      }).join('');
      // Each row is one vector object, so cards stay together across page breaks.
      rows.push({
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${cards}</svg>`,
        width, margin: [0, 0, 0, GAP],
      });
    }
    return rows;
  } finally {
    document.fonts.delete(font);
  }
}
