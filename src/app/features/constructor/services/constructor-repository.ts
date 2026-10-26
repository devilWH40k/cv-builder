import { inject, Injectable } from '@angular/core';
import { completed, CvDatabase } from '../../cv/services/cv-database';
import { ConstructorDocument, DesignSummary } from '../interfaces/constructor-document';
import { parseDesign } from '../helpers/design-validation';

const RECENT_VISITS_KEY = 'constructor-recent-visits';

function visitTimes(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0,
    ),
  );
}

@Injectable({ providedIn: 'root' })
export class ConstructorRepository {
  private readonly database = inject(CvDatabase);

  async list(): Promise<readonly DesignSummary[]> {
    const database = await this.database.open();
    const transaction = database.transaction('constructor-designs', 'readonly');
    const request: IDBRequest<ConstructorDocument[]> = transaction
      .objectStore('constructor-designs')
      .getAll();
    await completed(transaction);
    return request.result
      .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))
      .sort((first, second) => second.updatedAt - first.updatedAt);
  }

  async load(id: string): Promise<ConstructorDocument | null> {
    const database = await this.database.open();
    const transaction = database.transaction('constructor-designs', 'readonly');
    const request: IDBRequest<unknown> = transaction.objectStore('constructor-designs').get(id);
    await completed(transaction);
    return request.result === undefined ? null : parseDesign(request.result);
  }

  async recentlyVisited(limit = 6): Promise<readonly DesignSummary[]> {
    const database = await this.database.open();
    const transaction = database.transaction('metadata', 'readonly');
    const request: IDBRequest<unknown> = transaction.objectStore('metadata').get(RECENT_VISITS_KEY);
    await completed(transaction);
    const visits = visitTimes(request.result);
    return (await this.list())
      .filter((design) => visits[design.id] !== undefined)
      .map((design) => ({ ...design, visitedAt: visits[design.id] }))
      .sort((first, second) => second.visitedAt - first.visitedAt)
      .slice(0, limit);
  }

  async recordVisit(id: string): Promise<void> {
    const database = await this.database.open();
    const transaction = database.transaction(['metadata', 'constructor-designs'], 'readwrite');
    const metadata = transaction.objectStore('metadata');
    const design = transaction.objectStore('constructor-designs').getKey(id);
    design.onsuccess = () => {
      if (design.result === undefined) return;
      const request: IDBRequest<unknown> = metadata.get(RECENT_VISITS_KEY);
      request.onsuccess = () =>
        metadata.put({ ...visitTimes(request.result), [id]: Date.now() }, RECENT_VISITS_KEY);
    };
    await completed(transaction);
  }

  async save(design: ConstructorDocument): Promise<void> {
    const validated = parseDesign(design);
    const database = await this.database.open();
    const transaction = database.transaction('constructor-designs', 'readwrite');
    transaction.objectStore('constructor-designs').put(validated);
    await completed(transaction);
  }

  async delete(id: string): Promise<void> {
    const database = await this.database.open();
    const transaction = database.transaction(['constructor-designs', 'metadata'], 'readwrite');
    transaction.objectStore('constructor-designs').delete(id);
    const metadata = transaction.objectStore('metadata');
    const request: IDBRequest<unknown> = metadata.get(RECENT_VISITS_KEY);
    request.onsuccess = () => {
      const visits = visitTimes(request.result);
      delete visits[id];
      metadata.put(visits, RECENT_VISITS_KEY);
    };
    await completed(transaction);
  }
}
