import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConstructorSvgAssets {
  private readonly http = inject(HttpClient, { optional: true });

  async read(source: string): Promise<string | null> {
    if (source.startsWith('data:image/svg+xml')) {
      const comma = source.indexOf(',');
      return source.slice(0, comma).includes(';base64')
        ? new TextDecoder().decode(Uint8Array.from(atob(source.slice(comma + 1)), (char) => char.charCodeAt(0)))
        : decodeURIComponent(source.slice(comma + 1));
    }
    const url = new URL(source, document.baseURI);
    if (!url.pathname.toLowerCase().endsWith('.svg') || url.origin !== location.origin) return null;
    if (!this.http) throw new Error('SVG icons could not be loaded. Please try again.');
    return firstValueFrom(this.http.get(url.href, { responseType: 'text' }));
  }
}
