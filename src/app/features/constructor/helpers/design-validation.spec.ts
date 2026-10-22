import { Textbox, FabricImage } from 'fabric';
import { blankDesign } from './preview-to-design';
import { parseDesign, validateDesignScene } from './design-validation';
import { safeDesignLink } from './design-assets';
import './fabric-metadata';

describe('Portable constructor designs', () => {
  it('validates schema and page identity before loading an editor scene', () => {
    const design = blankDesign();
    expect(parseDesign(design)).toEqual(design);
    expect(() => parseDesign({ ...design, schemaVersion: 99 })).toThrow();
    expect(() => parseDesign({ ...design, pages: [] })).toThrow();
    expect(() => parseDesign({ ...design, pages: [design.pages[0], design.pages[0]] })).toThrow();
    expect(() => parseDesign({ ...design, updatedAt: NaN })).toThrow();
  });

  it('blocks remote images, executable links and unknown Fabric classes', () => {
    for (const object of [
      { type: 'Image', src: 'https://example.com/private.png' },
      { type: 'Textbox', linkUrl: 'javascript:alert(1)' },
      { type: 'UnknownPlugin' },
      { type: 'Image', src: 'data:image/svg+xml,<svg />' },
    ])
      expect(() => validateDesignScene(JSON.stringify({ objects: [object] }))).toThrow();
    expect(safeDesignLink('mailto:alex@example.com')).toBe('mailto:alex@example.com');
    expect(safeDesignLink('https://example.com/profile')).toBe('https://example.com/profile');
    expect(safeDesignLink('https://user:secret@example.com')).toBeNull();
  });

  it('accepts native text and embedded raster image serialization', () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 10;
    const image = new FabricImage(canvas);
    const text = new Textbox('Alex', { fontFamily: 'Roboto' });
    text.linkUrl = 'https://example.com';
    expect(() =>
      validateDesignScene(JSON.stringify({ objects: [text.toObject(), image.toObject()] })),
    ).not.toThrow();
  });
});
