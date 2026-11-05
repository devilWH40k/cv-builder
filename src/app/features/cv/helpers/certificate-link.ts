export function certificateLink(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href : null;
  } catch {
    return null;
  }
}
