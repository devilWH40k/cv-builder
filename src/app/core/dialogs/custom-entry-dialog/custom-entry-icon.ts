export type CustomEntryIcons = Readonly<Record<string, string>>;

export function entryIcon(icons: Readonly<Record<string, string | undefined>>, name: string): string | undefined {
  return Object.hasOwn(icons, name) ? icons[name] : undefined;
}

/** Normalize uploads locally so every icon has the same dimensions and safe raster format. */
export async function normalizeEntryIcon(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.type) || file.size > 5 * 1024 ** 2) {
    throw new Error('Choose a PNG, JPEG, WebP, GIF, or SVG image up to 5 MB.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    const context = canvas.getContext('2d');
    if (!context || !image.naturalWidth || !image.naturalHeight) throw new Error('Invalid image');
    const scale = 96 / Math.max(image.naturalWidth, image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (96 - width) / 2, (96 - height) / 2, width, height);
    return canvas.toDataURL('image/png');
  } catch {
    throw new Error('This image could not be read. Please choose another icon.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
