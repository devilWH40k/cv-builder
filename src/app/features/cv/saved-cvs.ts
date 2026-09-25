import { DestroyRef, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { CvInfo } from './cv-draft';
import { parseLegacyCvs, LEGACY_STORAGE_KEY } from './legacy-saved-cvs';

export interface SavedCv {
  readonly id: string;
  readonly info: CvInfo;
  readonly updatedAt: number;
}

export const CV_DATABASE_NAME = new InjectionToken<string>('CV database name', {
  providedIn: 'root', factory: () => 'cv-builder'
});

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Storage transaction aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Storage transaction failed.'));
  });
}

@Injectable({ providedIn: 'root' })
export class SavedCvs {
  private readonly databaseName = inject(CV_DATABASE_NAME);
  private database: Promise<IDBDatabase> | null = null;
  private readonly records = signal<readonly SavedCv[]>([]);
  readonly all = this.records.asReadonly();
  readonly error = signal('');
  readonly migrationWarning = signal('');
  readonly loading = signal(false);
  readonly storageEstimate = signal<{ usedMb: string; quotaGb: string } | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      void this.database?.then((database) => database.close(), () => undefined);
    });
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const records = await this.request<SavedCv[]>('readonly', (store) => store.getAll());
      this.records.set(records.sort((first, second) => second.updatedAt - first.updatedAt));
      this.error.set('');
    } catch {
      this.error.set('Saved CVs could not be read. Browser storage may be unavailable.');
    } finally {
      await this.updateStorageEstimate();
      this.loading.set(false);
    }
  }

  async save(info: CvInfo, id: string | null): Promise<string> {
    const record: SavedCv = {
      id: id ?? crypto.randomUUID(), info: structuredClone(info), updatedAt: Date.now()
    };
    await this.request('readwrite', (store) => store.put(record));
    await this.refresh();
    return record.id;
  }

  async delete(id: string): Promise<void> {
    await this.request('readwrite', (store) => store.delete(id));
    await this.refresh();
  }

  async load(id: string): Promise<CvInfo | null> {
    const record = await this.request<SavedCv | undefined>('readonly', (store) => store.get(id));
    return record?.info ?? null;
  }

  private async updateStorageEstimate(): Promise<void> {
    try {
      const estimate = await navigator.storage?.estimate?.();
      const usage = estimate?.usage;
      const quota = estimate?.quota;
      this.storageEstimate.set(
        typeof usage === 'number' && Number.isFinite(usage) && usage >= 0 &&
          typeof quota === 'number' && Number.isFinite(quota) && quota > 0
          ? { usedMb: (usage / 1024 ** 2).toFixed(2), quotaGb: (quota / 1024 ** 3).toFixed(2) }
          : null
      );
    } catch {
      this.storageEstimate.set(null);
    }
  }

  private async request<T>(
    mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const database = await this.open();
    const transaction = database.transaction('cvs', mode);
    const request = operation(transaction.objectStore('cvs'));
    await completed(transaction);
    return request.result;
  }

  private open(): Promise<IDBDatabase> {
    if (!this.database) {
      this.database = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(this.databaseName, 1);
        let blocked = false;
        request.onupgradeneeded = () => {
          const database = request.result;
          database.createObjectStore('cvs', { keyPath: 'id' });
          database.createObjectStore('metadata');
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () => {
          blocked = true;
          reject(new Error('Close other CV Builder tabs and try again.'));
        };
        request.onsuccess = () => {
          const database = request.result;
          if (blocked) {
            database.close();
            return;
          }
          database.onversionchange = () => {
            database.close();
            this.database = null;
          };
          resolve(database);
        };
      }).then(async (database) => {
        try {
          await this.migrate(database);
        } catch {
          this.migrationWarning.set(
            'Some older CVs could not be migrated. Their original local storage data has been kept.'
          );
        }
        return database;
      }).catch((error: unknown) => {
        this.database = null;
        throw error;
      });
    }
    return this.database;
  }

  private async migrate(database: IDBDatabase): Promise<void> {
    const check = database.transaction('metadata', 'readonly');
    const marker = check.objectStore('metadata').get('local-storage-migrated');
    await completed(check);
    if (marker.result === true) return;
    const original = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (original === null) return;
    const records = parseLegacyCvs(original);
    const transaction = database.transaction(['cvs', 'metadata'], 'readwrite');
    const done = completed(transaction);
    const store = transaction.objectStore('cvs');
    for (const record of records) {
      const existing = store.get(record.id);
      existing.onsuccess = () => {
        try {
          if (!existing.result) store.put(record);
        } catch {
          transaction.abort();
        }
      };
    }
    transaction.objectStore('metadata').put(true, 'local-storage-migrated');
    await done;
    if (localStorage.getItem(LEGACY_STORAGE_KEY) === original) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else {
      this.migrationWarning.set('Older local saves changed in another tab and have been kept.');
    }
  }
}

