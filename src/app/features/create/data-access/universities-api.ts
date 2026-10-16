import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, timeout } from 'rxjs';

function universityNames(response: unknown): readonly string[] {
  if (typeof response !== 'object' || response === null || !('items' in response) ||
    !Array.isArray(response.items)) throw new Error('Invalid university response');

  const names = response.items.flatMap((item: unknown): string[] => {
    if (typeof item !== 'object' || item === null || !('names' in item) ||
      !Array.isArray(item.names)) return [];
    return item.names.flatMap((name: unknown): string[] => {
      if (typeof name !== 'object' || name === null || !('value' in name) ||
        typeof name.value !== 'string' || !name.value.trim() || !('types' in name) ||
        !Array.isArray(name.types) || !name.types.includes('ror_display')) return [];
      return [name.value];
    });
  });
  return [...new Set(names)].slice(0, 10);
}

@Injectable({ providedIn: 'root' })
export class UniversitiesApi {
  private readonly http = inject(HttpClient);

  search(query: string): Observable<readonly string[]> {
    return this.http.get<unknown>('https://api.ror.org/v2/organizations', {
      params: { query, filter: 'types:education' }
    }).pipe(timeout(5000), map(universityNames));
  }
}
