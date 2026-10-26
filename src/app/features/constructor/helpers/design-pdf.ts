import { FabricObject, Group, StaticCanvas } from 'fabric';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { A4_HEIGHT, A4_WIDTH, ConstructorDocument } from '../interfaces/constructor-document';
import { loadDesignFonts, safeDesignLink } from './design-assets';
import './fabric-metadata';
import { rasterEffectSvg } from './effect-shapes';
import './layout-textbox';

function linkedSvg(svg: string, link: string | undefined): string {
  const url = safeDesignLink(link ?? '');
  if (!url) return svg;
  const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'a');
  wrapper.setAttributeNS(
    'http://www.w3.org/2000/xmlns/',
    'xmlns:xlink',
    'http://www.w3.org/1999/xlink',
  );
  wrapper.setAttribute('href', url);
  wrapper.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url);
  // The SVG comes from Fabric, and all images were normalized to local raster data.
  wrapper.innerHTML = svg;
  return new XMLSerializer().serializeToString(wrapper);
}

/** Restore inline hyperlinks inside multiline text without rasterizing its glyphs. */
function objectSvg(object: FabricObject, render = () => object.toSVG()): string {
  if (object instanceof Group) {
    // Keep Fabric's group clipping, opacity and transforms while decorating each child.
    const renderers = object.getObjects().map((child) => ({ child, toSVG: child.toSVG }));
    try {
      for (const { child, toSVG } of renderers)
        child.toSVG = () => child.excludeFromExport ? '' : objectSvg(child, () => toSVG.call(child));
      return linkedSvg(render(), object.linkUrl);
    } finally {
      for (const { child, toSVG } of renderers) child.toSVG = toSVG;
    }
  }
  const source = object.designBlur ? rasterEffectSvg(object) : render();
  if (!object.designTextLinks?.length || object.linkUrl) return linkedSvg(source, object.linkUrl);
  const document = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${source}</svg>`,
    'image/svg+xml',
  );
  const spans = Array.from(document.querySelectorAll('tspan'));
  const compact = (text: string) => text.replace(/\s/g, '');
  const combined = spans.map((span) => compact(span.textContent ?? '')).join('');
  const ranges: { start: number; end: number; url: string }[] = [];
  let cursor = 0;
  for (const link of object.designTextLinks) {
    const label = compact(link.text);
    const url = safeDesignLink(link.linkUrl);
    const start = combined.indexOf(label, cursor);
    if (!label || !url || start < 0) continue;
    ranges.push({ start, end: start + label.length, url });
    cursor = start + label.length;
  }
  let offset = 0;
  for (const span of spans) {
    const characters = Array.from(span.textContent ?? '');
    span.replaceChildren();
    for (const character of characters) {
      const range = ranges.find((range) => offset >= range.start && offset < range.end);
      if (range) {
        const anchor = document.createElementNS('http://www.w3.org/2000/svg', 'a');
        anchor.setAttribute('href', range.url);
        anchor.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', range.url);
        anchor.textContent = character;
        span.append(anchor);
      } else span.append(document.createTextNode(character));
      offset += compact(character).length;
    }
  }
  return Array.from(document.documentElement.children, (node) => new XMLSerializer().serializeToString(node)).join('');
}

export async function buildDesignPdf(design: ConstructorDocument): Promise<TDocumentDefinitions> {
  await loadDesignFonts();
  const content: Content[] = [];
  for (const [index, page] of design.pages.entries()) {
    const canvas = new StaticCanvas(undefined, { width: A4_WIDTH, height: A4_HEIGHT });
    try {
      await canvas.loadFromJSON(page.scene);
      // Keep <text>/<tspan> nodes and paint gradients; never rasterize the page.
      const svg = new DOMParser().parseFromString(
        canvas.toSVG({
          suppressPreamble: true,
          viewBox: { x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT },
        }),
        'image/svg+xml',
      );
      const svgRoot = svg.documentElement;
      // Replace Fabric's body with per-object SVG to preserve explicit hyperlinks.
      const body = canvas
        .getObjects()
        .filter((object) => !object.excludeFromExport)
        .map((object) => objectSvg(object))
        .join('');
      const background =
        typeof canvas.backgroundColor === 'string' ? canvas.backgroundColor : '#ffffff';
      const backdrop = svg.createElementNS('http://www.w3.org/2000/svg', 'rect');
      backdrop.setAttribute('width', String(A4_WIDTH));
      backdrop.setAttribute('height', String(A4_HEIGHT));
      backdrop.setAttribute('fill', background);
      svgRoot.replaceChildren(backdrop);
      const group = svg.createElementNS('http://www.w3.org/2000/svg', 'g');
      svgRoot.append(group);
      group.innerHTML = (canvas.backgroundImage?.toSVG() ?? '') + body;
      content.push({
        svg: new XMLSerializer().serializeToString(svgRoot),
        width: 595.28,
        height: 841.89,
        ...(index < design.pages.length - 1 ? { pageBreak: 'after' } : {}),
      });
    } finally {
      await canvas.dispose();
    }
  }
  return {
    pageSize: 'A4',
    pageMargins: [0, 0, 0, 0],
    info: { title: design.title, creator: 'CV Builder Constructor' },
    defaultStyle: { font: 'Roboto' },
    content,
  };
}

export async function designPdfBlob(design: ConstructorDocument): Promise<Blob> {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  pdfMake.addVirtualFileSystem(fonts);
  return pdfMake.createPdf(await buildDesignPdf(design)).getBlob();
}
