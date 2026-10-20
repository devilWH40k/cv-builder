import { inject, Injectable } from '@angular/core';
import { completed, CvDatabase } from '../../cv/services/cv-database';
import { experienceSearchEntry, ExperienceSearchEntry, EXPERIENCE_SEARCH_KEYS } from '../../cv/helpers/experience-search';
import type { SavedExperience } from '../../cv/interfaces/experience';

export interface ExperienceSearch {
  readonly query: string;
  readonly columns: readonly string[];
}

export interface ExperiencePage {
  readonly records: readonly SavedExperience[];
  readonly nextOffset: number;
  readonly hasMore: boolean;
}

@Injectable({ providedIn: 'root' })
export class ExperiencesApi {
  private readonly database = inject(CvDatabase);

  async getPage(offset = 0, limit = 24,
    search: ExperienceSearch = { query: '', columns: EXPERIENCE_SEARCH_KEYS },
    signal?: AbortSignal): Promise<ExperiencePage> {
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
      throw new Error('Invalid experience page.');
    }
    signal?.throwIfAborted();
    await this.ensureIndex();
    signal?.throwIfAborted();
    const database = await this.database.open();
    signal?.throwIfAborted();
    const transaction = database.transaction(['experiences', 'experience-search'], 'readonly');
    const done = completed(transaction);
    const abort = () => transaction.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const request = transaction.objectStore('experience-search').index('order').openCursor();
    const query = search.query.trim().toLocaleLowerCase();
    const records: SavedExperience[] = [];
    let skipped = 0;
    let fetched = 0;
    let hasMore = false;
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (!query && offset && !skipped) { skipped = offset; cursor.advance(offset); return; }
      const entry: ExperienceSearchEntry = cursor.value;
      if (query && !search.columns.some((key) => entry.fields[key]?.includes(query))) { cursor.continue(); return; }
      if (skipped < offset) { skipped++; cursor.continue(); return; }
      if (fetched === limit) { hasMore = true; return; }
      const record: IDBRequest<SavedExperience | undefined> = transaction.objectStore('experiences').get(entry.id);
      record.onsuccess = () => { if (record.result) records.push(record.result); };
      fetched++;
      cursor.continue();
    };
    try { await done; }
    finally { signal?.removeEventListener('abort', abort); }
    return { records, nextOffset: offset + fetched, hasMore };
  }

  private async ensureIndex(): Promise<void> {
    const database = await this.database.open();
    const check = database.transaction('metadata', 'readonly');
    const marker = check.objectStore('metadata').get('experience-search-ready');
    await completed(check);
    if (marker.result === true) return;
    const transaction = database.transaction(['experiences', 'experience-search', 'metadata'], 'readwrite');
    const done = completed(transaction);
    const store = transaction.objectStore('experience-search');
    store.clear();
    const cursor = transaction.objectStore('experiences').openCursor();
    cursor.onsuccess = () => {
      try {
        if (!cursor.result) { transaction.objectStore('metadata').put(true, 'experience-search-ready'); return; }
        const record: SavedExperience = cursor.result.value;
        store.put(experienceSearchEntry(record));
        cursor.result.continue();
      } catch { transaction.abort(); }
    };
    await done;
  }
}
