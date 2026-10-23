import { FabricImage, Gradient, Textbox } from 'fabric';
import { buildDesignPdf, designPdfBlob } from './design-pdf';
import { blankDesign } from './preview-to-design';
import './fabric-metadata';

describe('Constructor vector PDF', () => {
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
