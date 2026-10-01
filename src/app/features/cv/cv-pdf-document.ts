import { pdfTechnologyBlocks } from './cv-pdf-technology-blocks';
import pdfMake from 'pdfmake/build/pdfmake';
import fonts from 'pdfmake/build/vfs_fonts';
import htmlToPdfmake from 'html-to-pdfmake';
import type { Content, ContentColumns, Column, TDocumentDefinitions } from 'pdfmake/interfaces';
import { CvInfo, DEFAULT_CV_STRUCTURE } from './cv-draft';
import { USED_TECHNOLOGY_ICONS } from './used-technologies';
import { formatCalendarDate } from '../../shared/ui/date-picker/date-value';

pdfMake.addVirtualFileSystem(fonts);

/** Keep the converter limited to document markup, without embedded pdfmake instructions. */
export function pdfRichText(html: string): Content {
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('script, style, iframe, object, embed, img').forEach((node) => node.remove());
  for (const element of Array.from(document.body.querySelectorAll('*'))) {
    for (const attribute of Array.from(element.attributes)) {
      const safeLink = element.tagName === 'A' && attribute.name === 'href'
        && /^(https?:|mailto:|tel:)/i.test(attribute.value);
      if (!safeLink) element.removeAttribute(attribute.name);
    }
  }
  // Editors can leave empty paragraphs after a list; they should not separate jobs.
  let last = document.body.lastElementChild;
  while (last?.matches('p') && !last.textContent?.trim()) {
    last.remove();
    last = document.body.lastElementChild;
  }
  // Only the next experience heading supplies the gap, not nested list/paragraph margins.
  while (last) {
    if (last.matches('p, ul, ol, li')) last.setAttribute('style', 'margin-bottom: 0');
    last = last.lastElementChild;
  }
  return htmlToPdfmake(document.body.innerHTML, {
    defaultStyles: {
      p: { margin: [0, 0, 0, 6] },
      ul: { margin: [0, 0, 0, 6] },
      ol: { margin: [0, 0, 0, 6] },
      a: { decoration: 'underline' },
    },
  });
}

async function imageData(source: string, size: number, round = false): Promise<string> {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image conversion is unavailable');
  if (round) {
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.clip();
  }
  const scale = round
    ? Math.max(size / image.naturalWidth, size / image.naturalHeight)
    : Math.min(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  return canvas.toDataURL('image/png');
}

export async function buildCvPdf(cv: CvInfo): Promise<TDocumentDefinitions> {
  const structure = { ...DEFAULT_CV_STRUCTURE, ...cv.structure };
  const dark = structure.theme !== 'basic';
  const background = structure.theme === 'dark-blue' ? '#040a1b' : dark ? '#101114' : '#ffffff';
  const color = dark ? '#f8fafc' : '#000000';
  const accent = dark ? '#36d4f7' : '#000000';
  const muted = dark ? '#a3aab9' : '#475569';
  const header: ContentColumns['columns'] = [{
    stack: [
      { text: cv.name, fontSize: 24, bold: true, color: accent },
      { text: cv.positionTitle, fontSize: 13, color: muted, margin: [0, 8, 0, 0] },
      { text: cv.description, margin: [0, 11, 0, 0] },
    ],
    width: '*',
  }];
  if (cv.photo) {
    const url = URL.createObjectURL(cv.photo);
    try {
      header.unshift({ image: await imageData(url, 480, true), width: 113, height: 113 });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const icons: Record<string, string> = {};
  if (structure.technologiesView === 'blocks') {
    const technologies = [...new Set(cv.experiences.flatMap((entry) => [...entry.technologies]))];
    await Promise.all(technologies.map(async (technology) => {
      const source = USED_TECHNOLOGY_ICONS[technology];
      if (source) icons[technology] = await imageData(source, 96);
    }));
  }

  const heading = (text: string): Content => ({
    text, fontSize: 13, bold: true, margin: [0, 0, 0, 9], headlineLevel: 1,
  });
  const main: Content[] = [];
  if (cv.experiences.length) main.push(heading('Experience:'));
  for (const [index, entry] of cv.experiences.entries()) {
    main.push({
      text: entry.company + (entry.position ? ` | ${entry.position}` : ''),
      fontSize: 14, bold: true, margin: [0, index === 0 ? 0 : 20, 0, 6], headlineLevel: 1,
    });
    const start = formatCalendarDate(entry.startDate);
    const end = entry.isCurrent ? 'Present' : formatCalendarDate(entry.endDate);
    if (start || end) main.push({
      text: [start, end].filter(Boolean).join(' – '), fontSize: 10, color: muted,
      margin: [0, 0, 0, 9],
    });
    if (entry.technologies.length && structure.technologiesView === 'comma-separated') {
      main.push({ text: entry.technologies.join(', '), fontSize: 10, margin: [0, 0, 0, 9] });
    }
    main.push(pdfRichText(entry.description));
    if (entry.technologies.length && structure.technologiesView === 'blocks') {
      // Short rows wrap icon groups without making a long experience unbreakable.
      for (let index = 0; index < entry.technologies.length; index += 8) {
        main.push({
          columns: entry.technologies.slice(index, index + 8).map((technology): Column =>
            icons[technology]
              ? { image: icons[technology], width: 18, height: 18 }
              : { text: technology, width: 36, fontSize: 8 }),
          columnGap: 6, margin: [0, 5, 0, 0],
        });
      }
    }

  }

  const sidebar: Content[] = [];
  if (cv.languages.length) {
    sidebar.push(heading('Languages:'), ...cv.languages.map((language): Content => ({
      text: `${language.language} - ${language.level.split(' — ')[0]}`, margin: [0, 0, 0, 6],
    })), { text: '', margin: [0, 0, 0, 16] });
  }
  if (cv.technologies.length) {
    sidebar.push(heading('Tools/Technologies'));
    if (structure.sidebarTechnologiesView === 'blocks') {
      const sidebarWidth = (595.28 - 2 * 45.35 - 23) * 0.32;
      sidebar.push(...await pdfTechnologyBlocks(cv.technologies, sidebarWidth, accent, dark));
    } else {
      sidebar.push(...cv.technologies.map((text): Content => ({ text, margin: [0, 0, 0, 6] })));
    }
  }
  const columns: ContentColumns['columns'] = [
    { stack: main.length ? main : [{ text: '' }], width: '*' },
    { stack: sidebar.length ? sidebar : [{ text: '' }], width: '32%' },
  ];
  if (structure.sidebarPosition === 'left') columns.reverse();
  return {
    info: { title: `${cv.name} — CV`, author: cv.name },
    pageSize: 'A4',
    pageMargins: [45.35, 45.35, 45.35, 45.35],
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.25, color },
    background: (_page, size) => ({
      canvas: [{ type: 'rect', x: 0, y: 0, w: size.width, h: size.height, color: background }],
    }),
    content: [
      { columns: header, columnGap: 23 },
      { columns, columnGap: 23, margin: [0, 23, 0, 0] },
    ],
    pageBreakBefore: (node, container) =>
      node.headlineLevel === 1 && container.getFollowingNodesOnPage().length === 0,
  };
}

export async function downloadCvPdf(cv: CvInfo): Promise<void> {
  const definition = await buildCvPdf(cv);
  const name = cv.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim() || 'CV';
  await pdfMake.createPdf(definition).download(`${name}-CV.pdf`);
}
