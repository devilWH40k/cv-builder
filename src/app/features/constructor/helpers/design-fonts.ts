export const GOOGLE_DESIGN_FONTS = ['Inter', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway', 'Nunito', 'Source Sans 3', 'Merriweather', 'Lora', 'Playfair Display', 'Ubuntu', 'Roboto Mono'] as const;
export const DESIGN_FONTS = ['Roboto', ...GOOGLE_DESIGN_FONTS] as const;

const fontFiles: Readonly<Record<string, readonly [string, string]>> = {
  'Roboto Mono': ['roboto-mono', 'RobotoMono'],
  Inter: ['inter', 'Inter'], 'Open Sans': ['open-sans', 'OpenSans'],
  Lato: ['lato', 'Lato'], Montserrat: ['montserrat', 'Montserrat'],
  Poppins: ['poppins', 'Poppins'], Raleway: ['raleway', 'Raleway'],
  Nunito: ['nunito', 'Nunito'], 'Source Sans 3': ['source-sans-3', 'SourceSans3'],
  Merriweather: ['merriweather', 'Merriweather'], Lora: ['lora', 'Lora'],
  'Playfair Display': ['playfair-display', 'PlayfairDisplay'], Ubuntu: ['ubuntu', 'Ubuntu'],
};

export function designFontFiles(family: string): Record<'normal' | 'bold' | 'italics' | 'bolditalics', string> | undefined {
  const entry = Object.hasOwn(fontFiles, family) ? fontFiles[family] : undefined;
  if (!entry) return undefined;
  const [folder, prefix] = entry;
  const url = (style: string) => new URL(`fonts/${folder}/${prefix}-${style}.ttf`, document.baseURI).href;
  return { normal: url('Regular'), bold: url('Bold'), italics: url('Italic'), bolditalics: url('BoldItalic') };
}

const pendingFonts = new Map<string, Promise<void>>();

export function loadDesignFamily(family: string): Promise<void> {
  const files = designFontFiles(family);
  if (!files) return Promise.resolve();
  const existing = pendingFonts.get(family);
  if (existing) return existing;
  const pending = Promise.all(([
    ['normal', '400', 'normal'], ['bold', '700', 'normal'],
    ['italics', '400', 'italic'], ['bolditalics', '700', 'italic'],
  ] as const).map(async ([variant, weight, style]) => {
    const source = files[variant];
    const face = new FontFace(family, `url("${source}")`, { weight, style });
    return face.load();
  })).then((faces) => {
    faces.forEach((face) => document.fonts.add(face));
  }).catch((error: unknown) => {
    pendingFonts.delete(family);
    throw error;
  });
  pendingFonts.set(family, pending);
  return pending;
}

export async function loadSceneFonts(scene: string): Promise<void> {
  const families = [...scene.matchAll(/"fontFamily"\s*:\s*"([^"\\]+)"/g)].map((match) => match[1]);
  await Promise.all([...new Set(families)].map(loadDesignFamily));
}

/** Preserve older designs while replacing device-dependent generic font families. */
export function normalizeDesignFonts(scene: string): string {
  return JSON.stringify(JSON.parse(scene, (key: string, value: unknown) => {
    if (key !== 'fontFamily') return value;
    if (value === 'sans-serif') return 'Roboto';
    if (value === 'serif') return 'Lora';
    if (value === 'monospace') return 'Roboto Mono';
    return value;
  }));
}
