import { DestroyRef, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { parseLegacyCvs, LEGACY_STORAGE_KEY } from '../helpers/legacy-saved-cvs';

export const CV_DATABASE_NAME = new InjectionToken<string>('CV database name', {
  providedIn: 'root', factory: () => 'cv-builder'
});

export function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Storage transaction aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Storage transaction failed.'));
  });
}

@Injectable({ providedIn: 'root' })
export class CvDatabase {
  private readonly databaseName = inject(CV_DATABASE_NAME);
  private database: Promise<IDBDatabase> | null = null;
  private migrationPending = true;
  readonly migrationWarning = signal('');

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      void this.database?.then((database) => database.close(), () => undefined);
    });
  }

  open(): Promise<IDBDatabase> {
    if (!this.database) {
      this.database = this.connect().then(async (database) => {
        await this.migrateSafely(database);
        return database;
      }).catch((error: unknown) => {
        this.database = null;
        throw error;
      });
    } else if (this.migrationPending) {
      this.database = this.database.then(async (database) => {
        await this.migrateSafely(database);
        return database;
      });
    }
    return this.database;
  }

  private async migrateSafely(database: IDBDatabase): Promise<void> {
    try {
      await this.migrate(database);
      this.migrationPending = false;
    } catch {
      this.migrationPending = true;
      this.migrationWarning.set('Some older CVs could not be migrated. Their original local storage data has been kept.');
    }
  }

  private connect(version?: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, version);
      let blocked = false;
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('cvs')) database.createObjectStore('cvs', { keyPath: 'id' });
        if (!database.objectStoreNames.contains('metadata')) database.createObjectStore('metadata');
        if (!database.objectStoreNames.contains('experiences')) database.createObjectStore('experiences', { keyPath: 'id' });
        if (!database.objectStoreNames.contains('technologies')) database.createObjectStore('technologies', { keyPath: 'id' });
        if (!database.objectStoreNames.contains('folders')) database.createObjectStore('folders', { keyPath: 'id' });
        const cvs = request.transaction!.objectStore('cvs');
        if (!cvs.indexNames.contains('updatedAt')) cvs.createIndex('updatedAt', 'updatedAt');
        if (!database.objectStoreNames.contains('collection-items')) {
          const items = database.createObjectStore('collection-items', { keyPath: 'id' });
          items.createIndex('scope-position', ['scope', 'position'], { unique: true });
        }
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
        const missingStore = ['cvs', 'metadata', 'experiences', 'technologies', 'folders', 'collection-items']
          .some((name) => !database.objectStoreNames.contains(name));
        if (missingStore || !database.transaction('cvs').objectStore('cvs').indexNames.contains('updatedAt')) {
          const nextVersion = database.version + 1;
          database.close();
          void this.connect(nextVersion).then(resolve, reject);
          return;
        }
        database.onversionchange = () => {
          database.close();
          this.database = null;
          this.migrationPending = true;
        };
        resolve(database);
      };
    });
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
    transaction.objectStore('metadata').delete('collection-index-ready');
    await done;
    if (localStorage.getItem(LEGACY_STORAGE_KEY) === original) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else {
      this.migrationWarning.set('Older local saves changed in another tab and have been kept.');
    }
  }
}
