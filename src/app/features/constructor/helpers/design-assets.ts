let fontsReady: Promise<void> | undefined;

/** Reuse pdfmake's bundled, licensed fonts for matching canvas and PDF metrics. */
export function loadDesignFonts(): Promise<void> {
  fontsReady ??= (async () => {
    const { default: fonts } = await import('pdfmake/build/vfs_fonts');
    for (const [file, weight, style] of [
      ['Roboto-Regular.ttf', '400', 'normal'],
      ['Roboto-Medium.ttf', '700', 'normal'],
      ['Roboto-Italic.ttf', '400', 'italic'],
      ['Roboto-MediumItalic.ttf', '700', 'italic'],
    ]) {
      const encoded = fonts[file];
      if (!encoded) throw new Error('The document font is unavailable.');
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      const face = new FontFace('Roboto', bytes, { weight, style });
      document.fonts.add(await face.load());
    }
  })().catch((error: unknown) => {
    fontsReady = undefined;
    throw error;
  });
  return fontsReady;
}

export function fileDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('The image could not be read.'));
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(file);
  });
}

export function safeDesignLink(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /[\u0000-\u0020]/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return ['https:', 'http:', 'mailto:', 'tel:', 'viber:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function downloadDesignFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-');
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
