import { InjectionToken } from '@angular/core';

/** The host owns IndexedDB schema upgrades and connection cleanup. */
export interface ConstructorIndexedDbDatabase {
  open(): Promise<IDBDatabase>;
}

export const CONSTRUCTOR_INDEXEDDB_DATABASE = new InjectionToken<ConstructorIndexedDbDatabase>(
  'Constructor IndexedDB connection',
);
