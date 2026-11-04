import { Provider, ProviderToken } from '@angular/core';
import { provideConstructorStorage } from 'constructor/core';
import { CONSTRUCTOR_INDEXEDDB_DATABASE, ConstructorIndexedDbDatabase } from './constructor-indexeddb-database';
import { IndexedDbConstructorStorage } from './indexeddb-constructor-storage';

export function provideConstructorIndexedDbStorage(
  database: ProviderToken<ConstructorIndexedDbDatabase>,
): Provider[] {
  return [
    { provide: CONSTRUCTOR_INDEXEDDB_DATABASE, useExisting: database },
    provideConstructorStorage(IndexedDbConstructorStorage),
  ];
}
