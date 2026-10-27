import { Circle, FabricImage, FabricObject, Gradient, Rect, Textbox, version, TextStyle, TextStyleDeclaration } from 'fabric';
import { A4_WIDTH, ConstructorDocument } from '../interfaces/constructor-document';
import { identifyObject } from './fabric-metadata';
import { safeDesignLink } from './design-assets';
import { svgVector } from './svg-vector';

interface TextLine {
  page: number;
  x: number;
  y: number;
  right: number;
  text: string;
}

interface DescriptionFragment extends TextLine {
  style: TextStyleDeclaration;
}

interface DescriptionBlock {
  element: HTMLElement;
  fragments: DescriptionFragment[];
}

/** Convert measured preview fragments, including CSS column fragments, into native objects. */
export async function previewToDesign(
  root: HTMLElement,
  title: string,
  sourceCvId: string | null,
  readSvg?: (source: string) => Promise<string | null>,
): Promise<ConstructorDocument> {
  const sheet = root.querySelector<HTMLElement>('.cv-document');
  const flow = root.querySelector<HTMLElement>('.page-flow');
  if (!sheet || !flow) throw new Error('The CV preview is not ready. Please try again.');
  const origin = sheet.getBoundingClientRect();
  const flowOrigin = flow.getBoundingClientRect();
  const objects: FabricObject[][] = Array.from(
    { length: Math.max(1, root.querySelectorAll('.cv-document').length) },
    () => [],
  );
  const pageFor = (left: number) =>
    Math.max(0, Math.floor((left - flowOrigin.left + 0.5) / A4_WIDTH));
  const add = (object: FabricObject, page: number, label: string) => {
    if (page >= 50) throw new Error('Constructor designs support up to 50 pages.');
    objects[page] ??= [];
    identifyObject(object, label);
    objects[page].push(object);
  };

  // Decorations precede content so the text stays above its original backgrounds.
  for (const element of flow.querySelectorAll<HTMLElement>(
    '.cv-header, .cv-sidebar, .cv-technologies li, .experience-technologies li',
  )) {
    const style = getComputedStyle(element);
    const background = style.backgroundColor;
    const borderWidth = parseFloat(style.borderTopWidth) || 0;
    if (['rgba(0, 0, 0, 0)', 'transparent'].includes(background) && !borderWidth) continue;
    for (const bounds of element.getClientRects()) {
      const page = pageFor(bounds.left);
      add(
        new Rect({
          left: bounds.left - origin.left - page * A4_WIDTH,
          top: bounds.top - origin.top,
          width: bounds.width,
          height: bounds.height,
          fill: background,
          stroke: borderWidth ? style.borderTopColor : undefined,
          strokeWidth: borderWidth,
          rx: parseFloat(style.borderTopLeftRadius) || 0,
          ry: parseFloat(style.borderTopLeftRadius) || 0,
          originX: 'left',
          originY: 'top',
        }),
        page,
        'Background',
      );
    }
  }

  const walker = document.createTreeWalker(flow, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const descriptions = new Map<HTMLElement, DescriptionBlock>();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || parent.closest('svg, button') || !node.textContent?.trim()) continue;
    const style = getComputedStyle(parent);
    const lines: TextLine[] = [];
    for (const { segment, index } of segmenter.segment(node.textContent)) {
      range.setStart(node, index);
      range.setEnd(node, index + segment.length);
      const bounds = range.getBoundingClientRect();
      if (bounds.width < 0.1 || bounds.height < 0.1) continue;
      const page = pageFor(bounds.left);
      let line = lines.at(-1);
      if (!line || line.page !== page || Math.abs(line.y - (bounds.top - origin.top)) > 2) {
        line = {
          page,
          x: bounds.left - origin.left - page * A4_WIDTH,
          y: bounds.top - origin.top,
          right: bounds.right - origin.left - page * A4_WIDTH,
          text: '',
        };
        lines.push(line);
      }
      line.text += segment.replace(/[\r\n\t]/g, ' ');
      line.right = bounds.right - origin.left - page * A4_WIDTH;
    }
    const link = safeDesignLink(parent.closest('a')?.getAttribute('href') ?? '');
    const description = parent.closest<HTMLElement>('.description, .project-description');
    if (description) {
      const block = descriptions.get(description) ?? { element: description, fragments: [] };
      block.fragments.push(...lines.map<DescriptionFragment>((line) => ({ ...line, style: {
        fontSize: parseFloat(style.fontSize),
        fontWeight: Number(style.fontWeight) >= 600 ? 'bold' : 'normal',
        fontStyle: style.fontStyle === 'italic' ? 'italic' : 'normal',
        fill: textPaint(style),
        underline: style.textDecorationLine.includes('underline'),
        linethrough: style.textDecorationLine.includes('line-through'),
      } })));
      descriptions.set(description, block);
      continue;
    }
    for (const line of lines) {
      if (!line.text.trim()) continue;
      const text = new Textbox(line.text, {
        left: line.x,
        top: line.y,
        width: Math.max(8, line.right - line.x + 3),
        fontFamily: 'Roboto',
        fontSize: parseFloat(style.fontSize),
        fontWeight: Number(style.fontWeight) >= 600 ? 'bold' : 'normal',
        fontStyle: style.fontStyle === 'italic' ? 'italic' : 'normal',
        fill: textPaint(style),
        underline: style.textDecorationLine.includes('underline'),
        linethrough: style.textDecorationLine.includes('line-through'),
        originX: 'left',
        originY: 'top',
        padding: 0,
        splitByGrapheme: false,
      });
      if (link) text.linkUrl = link;
      add(text, line.page, line.text.trim().slice(0, 45));
    }
  }
  range.detach();

  for (const block of descriptions.values()) {
    for (const [page, text] of descriptionTextboxes(block, origin, pageFor)) {
      add(text, page, block.element.classList.contains('description') ? 'Personal summary' : 'Project description');
    }
  }

  for (const element of flow.querySelectorAll<HTMLElement>('li')) {
    if (element.closest('.description, .project-description')) continue;
    const style = getComputedStyle(element);
    if (style.display !== 'list-item' || style.listStyleType === 'none') continue;
    const bounds = element.getClientRects()[0];
    if (!bounds) continue;
    const page = pageFor(bounds.left);
    const fontSize = parseFloat(style.fontSize);
    const parent = element.parentElement;
    const number = parent
      ? Array.from(parent.children).indexOf(element) + Number(parent.getAttribute('start') || 1)
      : 1;
    const marker = style.listStyleType === 'decimal' ? `${number}.` : '•';
    add(
      new Textbox(marker, {
        left: bounds.left - origin.left - page * A4_WIDTH - fontSize * 1.5,
        top: bounds.top - origin.top,
        width: fontSize * 1.4,
        fontFamily: 'Roboto',
        fontSize,
        fill: style.color,
        originX: 'left',
        originY: 'top',
      }),
      page,
      'List marker',
    );
  }

  const images: HTMLImageElement[] = Array.from(flow.querySelectorAll<HTMLImageElement>('img'));
  for (const svg of flow.querySelectorAll<SVGSVGElement>('lucide-icon svg')) {
    const bounds = svg.getBoundingClientRect();
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('stroke', getComputedStyle(svg).color);
    if (!bounds.width || !bounds.height) continue;
    const source = new XMLSerializer().serializeToString(clone);
    const object = await svgVector(source, bounds.width, bounds.height, getComputedStyle(svg).color);
    if (!object) throw new Error('A contact icon could not be converted to a vector.');
    const page = pageFor(bounds.left);
    object.set({ left: bounds.left - origin.left - page * A4_WIDTH, top: bounds.top - origin.top });
    object.linkUrl = safeDesignLink(svg.closest('a')?.getAttribute('href') ?? '') ?? '';
    add(object, page, 'Contact icon');
  }
  for (const image of images) {
    if (!image.complete || !image.naturalWidth) throw new Error('A CV image could not be loaded.');
    const bounds = image.getBoundingClientRect();
    if (!bounds.width || !bounds.height) continue;
    const portrait = image.classList.contains('portrait');
    const svgSource = !portrait && readSvg ? await readSvg(image.currentSrc || image.src) : null;
    const filter = getComputedStyle(image).filter;
    const vector = svgSource && ['none', 'invert(1)'].includes(filter)
      ? await svgVector(svgSource, bounds.width, bounds.height, getComputedStyle(image).color, filter === 'invert(1)') : null;
    const object = vector ?? await rasterImage(
      image,
      bounds.width,
      bounds.height,
      portrait,
      getComputedStyle(image).filter,
    );
    if (vector && image.src.startsWith('data:image/svg+xml')) object.designIconName = image.alt || 'Custom icon';
    const page = pageFor(bounds.left);
    object.set({
      left: bounds.left - origin.left - page * A4_WIDTH,
      top: bounds.top - origin.top,
      originX: 'left',
      originY: 'top',
    });
    if (portrait)
      object.clipPath = new Circle({
        radius: object.width / 2,
        originX: 'center',
        originY: 'center',
        left: 0,
        top: 0,
      });
    object.linkUrl = safeDesignLink(image.closest('a')?.getAttribute('href') ?? '') ?? '';
    add(object, page, portrait ? 'Portrait' : image.alt || 'Icon');
  }

  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title: title.slice(0, 200) || 'Untitled design',
    sourceCvId,
    updatedAt: Date.now(),
    pages: objects.map((page) => ({
      id: crypto.randomUUID(),
      scene: JSON.stringify({
        version,
        background: getComputedStyle(sheet).backgroundColor,
        objects: page.map((object) => object.toObject()),
      }),
    })),
  };
}

/** Preserve measured visual lines and rich styles inside a single editable text object. */
function descriptionTextboxes(
  block: DescriptionBlock,
  origin: DOMRect,
  pageFor: (left: number) => number,
): Map<number, Textbox> {
  const fragments = [...block.fragments];
  for (const item of block.element.querySelectorAll<HTMLElement>('li')) {
    const style = getComputedStyle(item);
    if (style.display !== 'list-item' || style.listStyleType === 'none') continue;
    const bounds = item.getClientRects()[0];
    if (!bounds) continue;
    const page = pageFor(bounds.left);
    const size = parseFloat(style.fontSize);
    const siblings = item.parentElement ? Array.from(item.parentElement.children) : [];
    const number = siblings.indexOf(item) + Number(item.parentElement?.getAttribute('start') || 1);
    fragments.push({
      page, x: bounds.left - origin.left - page * A4_WIDTH - size * 1.5,
      right: bounds.left - origin.left - page * A4_WIDTH,
      y: bounds.top - origin.top,
      text: style.listStyleType === 'decimal' ? `${number}. ` : '\u2022 ',
      style: { fontSize: size, fill: style.color },
    });
  }
  const pages = new Map<number, Textbox>();
  for (const page of new Set(fragments.map((fragment) => fragment.page))) {
    const pageFragments = fragments.filter((fragment) => fragment.page === page);
    const lines: DescriptionFragment[][] = [];
    for (const fragment of pageFragments.sort((a, b) => a.y - b.y || a.x - b.x)) {
      const line = lines.find((line) => Math.abs(line[0].y - fragment.y) <= 2);
      if (line) line.push(fragment);
      else lines.push([fragment]);
    }
    const left = Math.min(...pageFragments.map((fragment) => fragment.x));
    const right = Math.max(...pageFragments.map((fragment) => fragment.right));
    const base = getComputedStyle(block.element);
    const fontSize = parseFloat(base.fontSize);
    const lineHeight = parseFloat(base.lineHeight) || fontSize * 1.2;
    const content: string[] = [];
    const styles: TextStyle = {};
    let previousY = lines[0][0].y;
    for (const fragments of lines) {
      // Empty lines retain paragraph/list spacing without creating separate canvas objects.
      const gap = Math.max(0, Math.round((fragments[0].y - previousY) / lineHeight) - 1);
      for (let index = 0; index < gap; index++) content.push('');
      const lineIndex = content.length;
      styles[lineIndex] = {};
      let text = '';
      for (const fragment of fragments.sort((a, b) => a.x - b.x)) {
        const offset = Array.from(segmentText(text)).length;
        const chars = Array.from(segmentText(fragment.text));
        chars.forEach((_, index) => { styles[lineIndex][offset + index] = fragment.style; });
        text += fragment.text;
      }
      content.push(text);
      previousY = fragments[0].y;
    }
    const text = new Textbox(content.join('\n'), {
      left, top: lines[0][0].y, width: Math.max(8, right - left + fontSize),
      fontFamily: 'Roboto', fontSize, fill: base.color,
      lineHeight: lineHeight / (fontSize * 1.13),
      styles, originX: 'left', originY: 'top', padding: 0,
    });
    text.designTextLinks = Array.from(block.element.querySelectorAll<HTMLAnchorElement>('a'))
      .map((anchor) => ({ text: anchor.textContent ?? '', linkUrl: safeDesignLink(anchor.getAttribute('href') ?? '') ?? '' }))
      .filter((link) => !!link.text.trim() && !!link.linkUrl && text.text.replace(/\s/g, '').includes(link.text.replace(/\s/g, '')));
    pages.set(page, text);
  }
  return pages;
}

function segmentText(text: string): string[] {
  return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (part) => part.segment);
}

function textPaint(style: CSSStyleDeclaration): string | Gradient<'linear'> {
  const colors = style.backgroundImage.startsWith('linear-gradient(')
    ? style.backgroundImage.match(/rgba?\([^)]+\)/g)
    : null;
  return colors && colors.length >= 2
    ? new Gradient({
        type: 'linear',
        gradientUnits: 'percentage',
        coords: { x1: 0, y1: 0, x2: 1, y2: 0 },
        colorStops: colors.map((color, index) => ({ color, offset: index / (colors.length - 1) })),
      })
    : style.color;
}

async function rasterImage(
  image: HTMLImageElement,
  cssWidth: number,
  cssHeight: number,
  cover: boolean,
  filter = 'none',
): Promise<FabricImage> {
  const raster = document.createElement('canvas');
  raster.width = Math.max(1, Math.ceil(cssWidth * 2));
  raster.height = Math.max(1, Math.ceil(cssHeight * 2));
  const context = raster.getContext('2d');
  if (!context) throw new Error('Image conversion is unavailable.');
  context.filter = filter;
  const ratio = cover
    ? Math.max(raster.width / image.naturalWidth, raster.height / image.naturalHeight)
    : Math.min(raster.width / image.naturalWidth, raster.height / image.naturalHeight);
  const width = image.naturalWidth * ratio;
  const height = image.naturalHeight * ratio;
  context.drawImage(image, (raster.width - width) / 2, (raster.height - height) / 2, width, height);
  const object = await FabricImage.fromURL(raster.toDataURL('image/png'));
  object.set({
    scaleX: cssWidth / raster.width,
    scaleY: cssHeight / raster.height,
    originX: 'left',
    originY: 'top',
  });
  return object;
}

/** Normalize the hidden source to the same font and 96-DPI page size used by export. */
export async function preparePreview(root: HTMLElement): Promise<void> {
  for (const element of root.querySelectorAll<HTMLElement>('.page-flow, .page-flow *')) {
    if (!element.closest('svg')) element.style.fontFamily = 'Roboto';
  }
  await document.fonts.ready;
  await Promise.all(
    Array.from(root.querySelectorAll<HTMLImageElement>('.page-flow img'), (image) =>
      image.decode(),
    ),
  );
  // Font/image metrics may change the preview's ResizeObserver pagination over two frames.
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

export function blankDesign(): ConstructorDocument {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title: 'Untitled design',
    sourceCvId: null,
    updatedAt: Date.now(),
    pages: [
      { id: crypto.randomUUID(), scene: JSON.stringify({ objects: [], background: '#ffffff' }) },
    ],
  };
}
