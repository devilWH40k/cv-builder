import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CompanyLogoPresets {
  private readonly http = inject(HttpClient);

  async usense(): Promise<File> {
    const svg = await firstValueFrom(this.http.get('usense-logo.svg', { responseType: 'text' }));
    return new File([svg], 'usense-logo.svg', { type: 'image/svg+xml' });
  }
}
