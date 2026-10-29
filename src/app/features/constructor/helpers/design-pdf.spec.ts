import { GOOGLE_DESIGN_FONTS } from './design-fonts';
import { FabricImage, Gradient, Group, Rect, Textbox } from 'fabric';
import { buildDesignPdf, designPdfBlob } from './design-pdf';
import { blankDesign } from './preview-to-design';
import './fabric-metadata';
import { EffectCircle, EffectRect } from './effect-shapes';
import { A4_HEIGHT, A4_WIDTH } from '../interfaces/constructor-document';
import { Mail } from 'lucide-angular';
import { iconSvg } from '../services/constructor-icons';
import { svgVector } from './svg-vector';

describe('Constructor vector PDF', () => {
  for (const family of GOOGLE_DESIGN_FONTS) {
    it(`embeds local ${family} regular and emphasis fonts in the PDF`, async () => {
      const objects = ([
        { fontWeight: 'normal', fontStyle: 'normal' },
        { fontWeight: 'bold', fontStyle: 'normal' },
        { fontWeight: 'normal', fontStyle: 'italic' },
        { fontWeight: 'bold', fontStyle: 'italic' },
      ] as const).map((style, index) => new Textbox('Font embedding test', {
        ...style, fontFamily: family, width: 300, top: index * 40,
      }).toObject());
      const blank = blankDesign();
      const blob = await designPdfBlob({ ...blank, pages: [{ ...blank.pages[0], scene: JSON.stringify({ objects }) }] });
      const pdf = await blob.text();
      expect(pdf).toContain(family.replace(/\s/g, ''));
      expect((pdf.match(/\/FontFile2\b/g) ?? []).length).toBeGreaterThanOrEqual(4);
    });
  }

  it('exports library icons as vector paths', async () => {
    const icon = await svgVector(iconSvg(Mail), 40, 40);
    if (!icon) throw new Error('Expected icon');
    icon.designIconName = 'Mail';
    const blank = blankDesign();
    const definition = await buildDesignPdf({ ...blank, pages: [{ ...blank.pages[0],
      scene: JSON.stringify({ objects: [icon.toObject()] }),
    }] });
    const content = Array.isArray(definition.content) ? definition.content[0] : definition.content;
    if (!content || typeof content !== 'object' || !('svg' in content) || typeof content.svg !== 'string')
      throw new Error('Expected SVG page');
    expect(content.svg).toContain('<path');
    expect(content.svg).not.toContain('<image');
  });
  for (const kind of ['rectangle', 'circle', 'line'] as const) {
    for (const nested of [false, true]) {
      it(`exports visible blurred ${kind} pixels in ${nested ? 'nested groups' : 'a group'}`, async () => {
        const shape = kind === 'circle'
          ? new EffectCircle({ left: 300, top: 300, radius: 50, fill: '#ff0000', strokeWidth: 0 })
          : new EffectRect({ left: 300, top: 300, width: 180, height: kind === 'line' ? 3 : 100,
              fill: '#ff0000', strokeWidth: 0 });
        shape.designBlur = 5;
        const text = new Textbox('Grouped caption', { left: 300, top: 480, width: 200, fontFamily: 'Roboto' });
        const inner = new Group([shape, text], { left: 350, top: 350, angle: 15, scaleX: 1.2, scaleY: 0.8 });
        const outer = nested ? new Group([inner], { angle: -10, scaleX: 0.9, scaleY: 1.1 }) : inner;
        outer.set('opacity', 0.5);
        shape.set('opacity', 0.8);
        const center = shape.getCenterPoint();
        const blank = blankDesign();
        const scene = JSON.stringify({ objects: [outer.toObject()] });
        const design = { ...blank, pages: [{ ...blank.pages[0], scene }] };
        const definition = await buildDesignPdf(design);
        const content = Array.isArray(definition.content) ? definition.content[0] : definition.content;
        if (!content || typeof content !== 'object' || !('svg' in content) || typeof content.svg !== 'string')
          throw new Error('Expected SVG page');
        expect(content.svg).toContain('<text');
        const svgDocument = new DOMParser().parseFromString(content.svg, 'image/svg+xml');
        expect(svgDocument.documentElement.textContent?.replace(/\s/g, '')).toContain('Groupedcaption');
        const image = new Image();
        image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(content.svg);
        await image.decode();
        const raster = document.createElement('canvas');
        raster.width = Math.ceil(A4_WIDTH);
        raster.height = Math.ceil(A4_HEIGHT);
        const context = raster.getContext('2d')!;
        context.drawImage(image, 0, 0);
        const pixel = context.getImageData(Math.floor(center.x), Math.floor(center.y), 1, 1).data;
        expect(pixel[0]).toBeGreaterThan(180);
        expect(pixel[1]).toBeLessThan(250);
        expect(pixel[2]).toBeLessThan(250);
        if (kind !== 'line') {
          expect(pixel[1]).toBeGreaterThan(140);
          expect(pixel[1]).toBeLessThan(175);
        }
        expect(JSON.stringify({ objects: [outer.toObject()] })).toBe(scene);
        const pdf = new TextDecoder('latin1').decode(await (await designPdfBlob(design)).arrayBuffer());
        expect(pdf).toContain('/Subtype /Image');
        expect(pdf).toContain('/Font');
      });
    }
  }

  it('preserves nested group transforms, opacity and text links', async () => {
    const text = new Textbox('Grouped text', { fontFamily: 'Roboto', width: 250 });
    text.linkUrl = 'https://example.com/grouped';
    const group = new Group([new Group([text]), new Rect({ width: 20, height: 20 })], {
      left: 100, top: 150, angle: 15, opacity: 0.5,
    });
    const blank = blankDesign();
    const design = { ...blank, pages: [{ ...blank.pages[0], scene: JSON.stringify({ objects: [group.toObject()] }) }] };
    const svg = JSON.stringify((await buildDesignPdf(design)).content);
    expect(svg).toContain('Grouped text');
    expect(svg).toContain('opacity: 0.5');
    expect(svg).toContain('matrix(');
    expect(svg).toContain('https://example.com/grouped');
    const pdf = new TextDecoder('latin1').decode(await (await designPdfBlob(design)).arrayBuffer());
    expect(pdf).toContain('https://example.com/grouped');
    expect(pdf).toContain('/Subtype /Link');
  });
  it('retains inline links within a single multiline rich text object', async () => {
    const text = new Textbox('Project details\nView project', { fontFamily: 'Roboto', width: 300 });
    text.designTextLinks = [{ text: 'View project', linkUrl: 'https://example.com/inline' }];
    const blank = blankDesign();
    const design = { ...blank, pages: [{ ...blank.pages[0], scene: JSON.stringify({ objects: [text.toObject()] }) }] };
    const pdf = new TextDecoder('latin1').decode(await (await designPdfBlob(design)).arrayBuffer());
    expect(pdf).toContain('/Subtype /Link');
    expect(pdf).toContain('https://example.com/inline');
  });
  it('exports the page color and background image behind editable text', async () => {
    const raster = document.createElement('canvas');
    raster.width = raster.height = 10;
    raster.getContext('2d')!.fillRect(0, 0, 10, 10);
    const background = new FabricImage(raster);
    const text = new Textbox('Foreground', { fontFamily: 'Roboto' });
    const blank = blankDesign();
    const design = { ...blank, pages: [{ ...blank.pages[0], scene: JSON.stringify({
      background: '#123456', backgroundImage: background.toObject(), objects: [text.toObject()],
    }) }] };
    const svg = JSON.stringify((await buildDesignPdf(design)).content);
    expect(svg).toContain('#123456');
    expect(svg).toContain('<image');
    expect(svg.indexOf('<image')).toBeLessThan(svg.indexOf('<text'));
    expect((await designPdfBlob(design)).size).toBeGreaterThan(0);
  });
  it('exports native gradient text, transforms and explicit email/web link annotations', async () => {
    const name = new Textbox('Alex Morgan', {
      left: 70,
      top: 70,
      width: 240,
      fontFamily: 'Roboto',
      fontSize: 28,
      angle: 12,
      fill: new Gradient({
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 240, y2: 0 },
        colorStops: [
          { color: '#ff0000', offset: 0 },
          { color: '#0000ff', offset: 1 },
        ],
      }),
    });
    name.linkUrl = 'https://example.com/profile';
    const email = new Textbox('Email me', { left: 80, top: 140, width: 200, fontFamily: 'Roboto' });
    email.linkUrl = 'mailto:alex@example.com';
    const raster = document.createElement('canvas');
    raster.width = raster.height = 20;
    raster.getContext('2d')!.fillRect(0, 0, 20, 20);
    const image = new FabricImage(raster, { left: 400, top: 80 });
    image.linkUrl = 'https://example.com/image';
    const blank = blankDesign();
    const design = {
      ...blank,
      pages: [
        {
          ...blank.pages[0],
          scene: JSON.stringify({ objects: [name.toObject(), email.toObject(), image.toObject()] }),
        },
      ],
    };
    const definition = await buildDesignPdf(design);
    const svg = JSON.stringify(definition.content);
    expect(svg).toContain('<text');
    expect(svg).toContain('Alex Morgan');
    expect(svg).toContain('linearGradient');
    const blob = await designPdfBlob(design);
    const pdf = new TextDecoder('latin1').decode(await blob.arrayBuffer());
    expect(pdf).toContain('/Subtype /Link');
    expect(pdf).toContain('https://example.com/profile');
    expect(pdf).toContain('mailto:alex@example.com');
    expect(pdf).toContain('/Font');
  });
});
