import { DestroyRef, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { CvExperience, SavedExperience } from './experience';
import { CvInfo } from './cv-draft';
import { parseLegacyCvs, LEGACY_STORAGE_KEY } from './legacy-saved-cvs';
import { SavedTechnology, technologyId } from './saved-technology';
import { CustomEntry } from '../../core/dialogs/custom-entry-dialog/custom-entry-dialog';

export interface SavedCv {
  readonly id: string;
  readonly info: CvInfo;
  readonly updatedAt: number;
}

export interface CvDatabaseSnapshot {
  readonly cvs: readonly SavedCv[];
  readonly experiences: readonly SavedExperience[];
  readonly technologies?: readonly SavedTechnology[];
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
  private readonly technologyRecords = signal<readonly SavedTechnology[]>([]);
  readonly technologies = this.technologyRecords.asReadonly();
  private technologyLoad: Promise<void> | null = null;

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

  async listExperiences(): Promise<SavedExperience[]> {
    const records = await this.request<SavedExperience[]>('readonly', (store) => store.getAll(), 'experiences');
    return records.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  loadTechnologies(): Promise<void> {
    this.technologyLoad ??= this.refreshTechnologies().catch((error: unknown) => {
      this.technologyLoad = null;
      throw error;
    });
    return this.technologyLoad;
  }

  private async refreshTechnologies(): Promise<void> {
    const records = await this.request<SavedTechnology[]>('readonly', (store) => store.getAll(), 'technologies');
    this.technologyRecords.set(records.sort((a, b) => a.name.localeCompare(b.name)));
  }

  async saveTechnology(entry: CustomEntry): Promise<CustomEntry> {
    await this.loadTechnologies();
    const id = technologyId(entry.name);
    const name = this.technologies().find((record) => record.id === id)?.name ?? entry.name.trim();
    if (!name) throw new Error('Entry name is required.');
    const record: SavedTechnology = {
      id: technologyId(name), name, ...(entry.icon ? { icon: entry.icon } : {}), updatedAt: Date.now()
    };
    await this.request('readwrite', (store) => store.put(record), 'technologies');
    this.technologyRecords.update((records) => [...records.filter((entry) => entry.id !== record.id), record]
      .sort((a, b) => a.name.localeCompare(b.name)));
    return { name: record.name, ...(record.icon ? { icon: record.icon } : {}) };
  }

  async saveExperience(experience: CvExperience): Promise<string> {
    const id = experience.savedExperienceId ?? crypto.randomUUID();
    const record: SavedExperience = {
      id, experience: structuredClone({ ...experience, savedExperienceId: id }), updatedAt: Date.now()
    };
    await this.request('readwrite', (store) => store.put(record), 'experiences');
    return id;
  }

  async snapshot(): Promise<readonly SavedCv[]> {
    return this.request<SavedCv[]>('readonly', (store) => store.getAll());
  }

  async backupSnapshot(): Promise<CvDatabaseSnapshot> {
    const database = await this.open();
    const transaction = database.transaction(['cvs', 'experiences', 'technologies'], 'readonly');
    const cvs = transaction.objectStore('cvs').getAll();
    const experiences = transaction.objectStore('experiences').getAll();
    const technologies = transaction.objectStore('technologies').getAll();
    await completed(transaction);
    return { cvs: cvs.result, experiences: experiences.result, technologies: technologies.result };
  }

  async importRecords(
    records: readonly SavedCv[], experiences: readonly SavedExperience[] = [],
    wipePreviousData = false, technologies: readonly SavedTechnology[] = []
  ): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(['cvs', 'experiences', 'technologies'], 'readwrite');
    const done = completed(transaction);
    let importedTechnologies: SavedTechnology[] = [];
    try {
      const cvsStore = transaction.objectStore('cvs');
      const experiencesStore = transaction.objectStore('experiences');
      const technologiesStore = transaction.objectStore('technologies');
      if (wipePreviousData) {
        cvsStore.clear();
        experiencesStore.clear();
        technologiesStore.clear();
      }
      for (const record of records) cvsStore.put(record);
      for (const record of technologies) technologiesStore.put(record);
      for (const record of experiences) {
        experiencesStore.put({
          ...record, experience: { ...record.experience, savedExperienceId: record.id }
        });
      }
      const library = technologiesStore.getAll();
      library.onsuccess = () => { importedTechnologies = library.result; };
    } catch {
      transaction.abort();
    }
    await done;
    await this.refresh();
    this.technologyRecords.set(importedTechnologies.sort((a, b) => a.name.localeCompare(b.name)));
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
    mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>, table = 'cvs'
  ): Promise<T> {
    const database = await this.open();
    const transaction = database.transaction(table, mode);
    const request = operation(transaction.objectStore(table));
    await completed(transaction);
    return request.result;
  }

  private open(): Promise<IDBDatabase> {
    if (!this.database) {
      this.database = this.connect().then(async (database) => {
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
        if (['cvs', 'metadata', 'experiences', 'technologies'].some((name) => !database.objectStoreNames.contains(name))) {
          const nextVersion = database.version + 1;
          database.close();
          void this.connect(nextVersion).then(resolve, reject);
          return;
        }
        database.onversionchange = () => {
          database.close();
          this.database = null;
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
    await done;
    if (localStorage.getItem(LEGACY_STORAGE_KEY) === original) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else {
      this.migrationWarning.set('Older local saves changed in another tab and have been kept.');
    }
  }
}

