import { inject, Injectable } from '@angular/core';
import { completed, CvDatabase } from './cv-database';
import type { SavedCv } from './saved-cvs';
import type { CvFolder } from '../interfaces/cv-folder';
import { orderSavedCvs } from '../helpers/cv-order';

interface CollectionItem {
  readonly id: string;
  readonly entityId: string;
  readonly kind: 'cv' | 'folder';
  readonly scope: string;
  readonly position: number;
}

export interface CvCollectionPage {
  readonly cvs: readonly SavedCv[];
  readonly folders: readonly CvFolder[];
  readonly total: number;
  readonly nextOffset: number;
  readonly hasMore: boolean;
}

export interface CvHeader { readonly id: string; readonly updatedAt: number; }

export function readCvHeaders(transaction: IDBTransaction, ready: (headers: CvHeader[]) => void): void {
  const headers: CvHeader[] = [];
  const request = transaction.objectStore('cvs').index('updatedAt').openKeyCursor();
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) { ready(headers); return; }
    if (typeof cursor.primaryKey === 'string' && typeof cursor.key === 'number') {
      headers.push({ id: cursor.primaryKey, updatedAt: cursor.key });
    }
    cursor.continue();
  };
}

@Injectable({ providedIn: 'root' })
export class CvCollectionApi {
  private readonly database = inject(CvDatabase);

  async getPage(offset = 0, limit = 24, folderId: string | null = null): Promise<CvCollectionPage> {
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
      throw new Error('Invalid collection page.');
    }
    await this.ensureIndex();
    const database = await this.database.open();
    const transaction = database.transaction(['collection-items', 'cvs', 'folders'], 'readonly');
    const done = completed(transaction);
    const index = transaction.objectStore('collection-items').index('scope-position');
    const scope = folderId === null ? 'root' : `folder:${folderId}`;
    const range = IDBKeyRange.bound([scope, 0], [scope, Number.MAX_SAFE_INTEGER]);
    const count = index.count(range);
    const cursor = index.openCursor(range);
    const cvs: SavedCv[] = [];
    const folders: CvFolder[] = [];
    let skipped = false;
    let fetched = 0;
    cursor.onsuccess = () => {
      const entry = cursor.result;
      if (!entry) return;
      if (offset && !skipped) { skipped = true; entry.advance(offset); return; }
      const item: CollectionItem = entry.value;
      if (item.kind === 'cv') {
        const request: IDBRequest<SavedCv | undefined> = transaction.objectStore('cvs').get(item.entityId);
        request.onsuccess = () => { if (request.result) cvs.push(request.result); };
      } else {
        const request: IDBRequest<CvFolder | undefined> = transaction.objectStore('folders').get(item.entityId);
        request.onsuccess = () => { if (request.result) folders.push(request.result); };
      }
      fetched++;
      if (fetched < limit) entry.continue();
    };
    await done;
    const nextOffset = offset + fetched;
    return { cvs, folders, total: count.result, nextOffset, hasMore: nextOffset < count.result };
  }

  async getLocation(cvId: string): Promise<string | null | undefined> {
    await this.ensureIndex();
    const database = await this.database.open();
    const transaction = database.transaction('collection-items', 'readonly');
    const request: IDBRequest<CollectionItem | undefined> = transaction.objectStore('collection-items').get(`cv:${cvId}`);
    await completed(transaction);
    return request.result ? request.result.scope === 'root' ? null : request.result.scope.slice(7) : undefined;
  }

  async getFolderCvs(folderId: string): Promise<readonly SavedCv[]> {
    const records: SavedCv[] = [];
    let offset = 0;
    let more: boolean;
    do {
      const page = await this.getPage(offset, 24, folderId);
      records.push(...page.cvs);
      offset = page.nextOffset;
      more = page.hasMore;
    } while (more);
    return records;
  }

  async refreshIndex(): Promise<void> {
    const database = await this.database.open();
    const transaction = database.transaction(['collection-items', 'cvs', 'folders', 'metadata'], 'readwrite');
    const done = completed(transaction);
    const folders: IDBRequest<CvFolder[]> = transaction.objectStore('folders').getAll();
    const order: IDBRequest<unknown> = transaction.objectStore('metadata').get('cv-order');
    readCvHeaders(transaction, (headers) => {
      try {
        const store = transaction.objectStore('collection-items');
        store.clear();
        const memberships = new Map(folders.result.flatMap((folder) => folder.cvIds.map((id) => [id, folder.id] as const)));
        let rootPosition = 0;
        for (const folder of [...folders.result].sort((a, b) => a.name.localeCompare(b.name))) {
          store.put({ id: `folder:${folder.id}`, entityId: folder.id, kind: 'folder', scope: 'root', position: rootPosition++ } satisfies CollectionItem);
        }
        const folderPositions = new Map<string, number>();
        // getAll() historically broke updatedAt ties by primary key; retain that order.
        headers.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
        for (const cv of orderSavedCvs(headers, order.result)) {
          const folder = memberships.get(cv.id);
          const position = folder === undefined ? rootPosition++ : folderPositions.get(folder) ?? 0;
          if (folder !== undefined) folderPositions.set(folder, position + 1);
          store.put({
            id: `cv:${cv.id}`, entityId: cv.id, kind: 'cv',
            scope: folder === undefined ? 'root' : `folder:${folder}`, position
          } satisfies CollectionItem);
        }
        transaction.objectStore('metadata').put(true, 'collection-index-ready');
      } catch { transaction.abort(); }
    });
    await done;
  }

  private async ensureIndex(): Promise<void> {
    const database = await this.database.open();
    const transaction = database.transaction('metadata', 'readonly');
    const request = transaction.objectStore('metadata').get('collection-index-ready');
    await completed(transaction);
    if (request.result !== true) await this.refreshIndex();
  }
}
