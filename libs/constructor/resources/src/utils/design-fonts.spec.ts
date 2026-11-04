import { DESIGN_FONTS, GOOGLE_DESIGN_FONTS, designFontFiles, loadDesignFamily, normalizeDesignFonts } from './design-fonts';

describe('Local constructor fonts', () => {
  it('provides four same-origin TTF variants for every Google family', () => {
    expect(DESIGN_FONTS.length).toBe(14);
    for (const family of GOOGLE_DESIGN_FONTS) {
      const files = designFontFiles(family)!;
      expect(Object.keys(files).length).toBe(4);
      for (const url of Object.values(files)) {
        expect(new URL(url).origin).toBe(location.origin);
        expect(url.endsWith('.ttf')).toBeTrue();
      }
    }
  });

  it('replaces legacy generic fonts with registered local families', () => {
    expect(DESIGN_FONTS.some((font: string) => ['serif', 'sans-serif', 'monospace'].includes(font))).toBeFalse();
    expect(JSON.parse(normalizeDesignFonts(JSON.stringify({ objects: [
      { fontFamily: 'sans-serif' }, { fontFamily: 'serif' }, { fontFamily: 'monospace' }
    ] }))).objects).toEqual([{ fontFamily: 'Roboto' }, { fontFamily: 'Lora' }, { fontFamily: 'Roboto Mono' }]);
  });

  it('loads local fonts once and caches the loaded family', async () => {
    const load = spyOn(FontFace.prototype, 'load').and.callThrough();
    await loadDesignFamily('Inter');
    const calls = load.calls.count();
    await loadDesignFamily('Inter');
    expect(load.calls.count()).toBe(calls);
    expect(document.fonts.check('16px Inter')).toBeTrue();
  });

  it('does not load files for generic browser or bundled families', async () => {
    const load = spyOn(FontFace.prototype, 'load');
    await loadDesignFamily('serif');
    await loadDesignFamily('Roboto');
    expect(load).not.toHaveBeenCalled();
  });
});
