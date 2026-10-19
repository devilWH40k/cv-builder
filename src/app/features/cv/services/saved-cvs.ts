import { DestroyRef, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { CvExperience, SavedExperience } from '../interfaces/experience';
import { CvInfo } from './cv-draft';
import { parseLegacyCvs, LEGACY_STORAGE_KEY } from '../helpers/legacy-saved-cvs';
import { SavedTechnology, technologyId } from '../helpers/saved-technology';
import { CustomEntry } from '../../../core/dialogs/custom-entry-dialog/custom-entry-dialog';
import { CvFolder } from '../interfaces/cv-folder';
import { CvReorder } from '../interfaces/cv-reorder';
import { orderSavedCvs } from '../helpers/cv-order';

export interface SavedCv {
  readonly id: string;
  readonly info: CvInfo;
  readonly updatedAt: number;
}

export interface CvDatabaseSnapshot {
  readonly cvs: readonly SavedCv[];
  readonly experiences: readonly SavedExperience[];
  readonly technologies?: readonly SavedTechnology[];
  readonly folders?: readonly CvFolder[];
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
  private readonly folderRecords = signal<readonly CvFolder[]>([]);
  readonly folders = this.folderRecords.asReadonly();
  private readonly completedImports = signal(0);
  readonly importRevision = this.completedImports.asReadonly();
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
      const database = await this.open();
      const transaction = database.transaction(['cvs', 'folders', 'metadata'], 'readonly');
      const records: IDBRequest<SavedCv[]> = transaction.objectStore('cvs').getAll();
      const folders: IDBRequest<CvFolder[]> = transaction.objectStore('folders').getAll();
      const order: IDBRequest<unknown> = transaction.objectStore('metadata').get('cv-order');
      await completed(transaction);
      this.records.set(orderSavedCvs(records.result, order.result));
      this.folderRecords.set(folders.result.sort((a, b) => a.name.localeCompare(b.name)));
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
    await this.editFolders((folders, cvsStore, foldersStore) => {
      cvsStore.delete(id);
      for (const folder of folders) {
        if (folder.cvIds.includes(id)) foldersStore.put({ ...folder, cvIds: folder.cvIds.filter((cvId) => cvId !== id) });
      }
    });
    await this.refresh();
  }

  async createFolder(name: string): Promise<CvFolder> {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 120) throw new Error('Enter a folder name of up to 120 characters.');
    const folder: CvFolder = { id: crypto.randomUUID(), name: trimmed, cvIds: [] };
    await this.request('readwrite', (store) => store.add(folder), 'folders');
    await this.refresh();
    return folder;
  }

  async deleteFolder(id: string): Promise<void> {
    await this.editFolders((folders, _cvsStore, foldersStore) => {
      const folder = folders.find((entry) => entry.id === id);
      if (folder?.cvIds.length) throw new Error('Only empty folders can be deleted.');
      foldersStore.delete(id);
    });
    await this.refresh();
  }

  async moveCv(id: string, folderId: string | null): Promise<void> {
    await this.editFolders((folders, cvsStore, foldersStore, abort) => {
      if (folderId !== null && !folders.some((folder) => folder.id === folderId)) {
        throw new Error('This folder no longer exists.');
      }
      const cv = cvsStore.get(id);
      cv.onsuccess = () => {
        try {
          if (!cv.result) throw new Error('This CV no longer exists.');
          for (const folder of folders) {
            const cvIds = folder.cvIds.filter((cvId) => cvId !== id);
            if (folder.id === folderId) cvIds.push(id);
            if (folder.cvIds.includes(id) || folder.id === folderId) foldersStore.put({ ...folder, cvIds });
          }
        } catch (error: unknown) { abort(error); }
      };
    });
    await this.refresh();
  }

  async reorderCv({ cvId, targetId, position }: CvReorder): Promise<void> {
    if (cvId === targetId) return;
    const database = await this.open();
    const transaction = database.transaction(['cvs', 'folders', 'metadata'], 'readwrite');
    const done = completed(transaction);
    let operationError: unknown;
    const cvs: IDBRequest<SavedCv[]> = transaction.objectStore('cvs').getAll();
    const folders: IDBRequest<CvFolder[]> = transaction.objectStore('folders').getAll();
    const metadata = transaction.objectStore('metadata');
    const order: IDBRequest<unknown> = metadata.get('cv-order');
    order.onsuccess = () => {
      try {
        if (![cvId, targetId].every((id) => cvs.result.some((cv) => cv.id === id))) {
          throw new Error('This CV no longer exists.');
        }
        const folderOf = (id: string) => folders.result.find((folder) => folder.cvIds.includes(id))?.id;
        if (folderOf(cvId) !== folderOf(targetId)) throw new Error('These CVs are in different collections.');
        const remaining = orderSavedCvs(cvs.result, order.result).map((cv) => cv.id).filter((id) => id !== cvId);
        const index = remaining.indexOf(targetId) + (position === 'after' ? 1 : 0);
        metadata.put([...remaining.slice(0, index), cvId, ...remaining.slice(index)], 'cv-order');
      } catch (error: unknown) {
        operationError = error;
        transaction.abort();
      }
    };
    await done.catch((error: unknown) => { throw operationError ?? error; });
    await this.refresh();
  }

  private async editFolders(
    update: (folders: readonly CvFolder[], cvs: IDBObjectStore, foldersStore: IDBObjectStore,
      abort: (error: unknown) => void) => void
  ): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(['cvs', 'folders'], 'readwrite');
    const done = completed(transaction);
    let operationError: unknown;
    const abort = (error: unknown) => { operationError = error; transaction.abort(); };
    const foldersStore = transaction.objectStore('folders');
    const request: IDBRequest<CvFolder[]> = foldersStore.getAll();
    request.onsuccess = () => {
      try { update(request.result, transaction.objectStore('cvs'), foldersStore, abort); }
      catch (error: unknown) { abort(error); }
    };
    await done.catch((error: unknown) => { throw operationError ?? error; });
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

  async deleteTechnology(id: string): Promise<void> {
    await this.loadTechnologies();
    await this.request('readwrite', (store) => store.delete(id), 'technologies');
    this.technologyRecords.update((records) => records.filter((record) => record.id !== id));
  }

  async saveExperience(experience: CvExperience): Promise<string> {
    const id = experience.savedExperienceId ?? crypto.randomUUID();
    const record: SavedExperience = {
      id, experience: structuredClone({ ...experience, savedExperienceId: id }), updatedAt: Date.now()
    };
    await this.request('readwrite', (store) => store.put(record), 'experiences');
    return id;
  }

  async deleteExperience(id: string): Promise<void> {
    await this.request('readwrite', (store) => store.delete(id), 'experiences');
  }

  async importExperiences(experiences: readonly CvExperience[]): Promise<readonly SavedExperience[]> {
    if (!experiences.length) return [];
    const records = experiences.map((experience): SavedExperience => {
      const id = crypto.randomUUID();
      return { id, updatedAt: Date.now(), experience: structuredClone({ ...experience, savedExperienceId: id }) };
    });
    const database = await this.open();
    const transaction = database.transaction('experiences', 'readwrite');
    const done = completed(transaction);
    try {
      const store = transaction.objectStore('experiences');
      for (const record of records) store.add(record);
    } catch {
      transaction.abort();
    }
    await done;
    return records;
  }

  async snapshot(): Promise<readonly SavedCv[]> {
    return this.request<SavedCv[]>('readonly', (store) => store.getAll());
  }

  async backupSnapshot(): Promise<CvDatabaseSnapshot> {
    const database = await this.open();
    const transaction = database.transaction(['cvs', 'experiences', 'technologies', 'folders'], 'readonly');
    const cvs = transaction.objectStore('cvs').getAll();
    const experiences = transaction.objectStore('experiences').getAll();
    const technologies = transaction.objectStore('technologies').getAll();
    const folders = transaction.objectStore('folders').getAll();
    await completed(transaction);
    return { cvs: cvs.result, experiences: experiences.result, technologies: technologies.result, folders: folders.result };
  }

  async importRecords(
    records: readonly SavedCv[], experiences: readonly SavedExperience[] = [],
    wipePreviousData = false, technologies: readonly SavedTechnology[] = [], folders: readonly CvFolder[] = []
  ): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(['cvs', 'experiences', 'technologies', 'folders', 'metadata'], 'readwrite');
    const done = completed(transaction);
    let importedTechnologies: SavedTechnology[] = [];
    try {
      const cvsStore = transaction.objectStore('cvs');
      const experiencesStore = transaction.objectStore('experiences');
      const technologiesStore = transaction.objectStore('technologies');
      const foldersStore = transaction.objectStore('folders');
      if (wipePreviousData) {
        cvsStore.clear();
        experiencesStore.clear();
        technologiesStore.clear();
        foldersStore.clear();
        transaction.objectStore('metadata').delete('cv-order');
      }
      for (const record of records) cvsStore.put(record);
      for (const record of technologies) technologiesStore.put(record);
      // Incoming folder membership wins over existing membership during a merge.
      const existingFolders: IDBRequest<CvFolder[]> = foldersStore.getAll();
      existingFolders.onsuccess = () => {
        try {
          const assignedIds = new Set(folders.flatMap((folder) => [...folder.cvIds]));
          for (const folder of existingFolders.result) {
            if (folder.cvIds.some((id) => assignedIds.has(id))) {
              foldersStore.put({ ...folder, cvIds: folder.cvIds.filter((id) => !assignedIds.has(id)) });
            }
          }
          for (const folder of folders) foldersStore.put(folder);
        } catch { transaction.abort(); }
      };
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
    this.completedImports.update((revision) => revision + 1);
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
        if (!database.objectStoreNames.contains('folders')) database.createObjectStore('folders', { keyPath: 'id' });
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
        if (['cvs', 'metadata', 'experiences', 'technologies', 'folders'].some((name) => !database.objectStoreNames.contains(name))) {
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

