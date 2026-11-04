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

