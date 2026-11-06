# Constructor storage

The editor, `ConstructorSession`, and Home's design lists use
`ConstructorRepository` from `constructor/core`. The repository validates documents
with `parseDesign` before saving and after loading, then delegates persistence to
the host-provided `ConstructorStorage`. Core and the editor have no IndexedDB
connection, transaction, schema, or store-name dependency.

```text
Editor / Home → ConstructorRepository → CONSTRUCTOR_STORAGE → selected adapter
                                                   ├ IndexedDB (current)
                                                   └ Firebase (future host adapter)
```

## Contract

Implement `ConstructorStorage` from `constructor/core`:

| Method | Required behavior |
| --- | --- |
| `list()` | Return design summaries ordered by `updatedAt`, newest first. |
| `load(id)` | Return the raw saved document, or `null` for a missing ID. The repository validates this untrusted value. |
| `save(design)` | Upsert the validated document using its existing ID and timestamps. Resolve only when the write succeeds. |
| `delete(id)` | Remove the document and its visit metadata together. A missing ID is a no-op. |
| `recentlyVisited(limit)` | Return at most `limit` summaries for existing, visited designs, ordered by `visitedAt`, newest first. A zero limit returns an empty list. |
| `recordVisit(id)` | Record a visit only when the design exists; do not change its content or `updatedAt`. Preserve other visits during concurrent updates. |

All operations return Promises. Reject on storage/network/permission failures;
do not turn a failed read into an empty list or a missing document. The repository
preserves rejections so existing save/load error handling remains effective.
Its `recentlyVisited()` default is six items.

Documents keep the versioned `ConstructorDocument` format. IDs are strings and
timestamps are numeric milliseconds since the Unix epoch; a remote adapter must
convert backend-specific representations before returning them. `DesignSummary`
contains `id`, `title`, `updatedAt`, and optional `visitedAt`. Stored data must not
contain backend SDK objects. The session owns document changes and save timestamps;
the adapter owns visit bookkeeping. Saved CV source documents remain independent.

## Current IndexedDB setup

The optional `constructor/indexeddb` entry point exports
`IndexedDbConstructorStorage`, `ConstructorIndexedDbDatabase`, and its provider:

```ts
import { provideConstructorIndexedDbStorage } from 'constructor/indexeddb';
import { CvDatabase } from './features/cv/services/cv-database';

// In the application's providers:
provideConstructorIndexedDbStorage(CvDatabase)
```

The supplied connection implements `open(): Promise<IDBDatabase>`. The host owns
opening, migrating, and closing it. It must contain `constructor-designs` with
key path `id`, and a `metadata` store with out-of-line keys. Visits use the existing
`constructor-recent-visits` metadata key. No migration or data copying is required
for this separation: the application still uses its existing `CvDatabase`, stores,
document IDs, and records. Deletion and visit updates use IndexedDB transactions.

## Future Firebase adapter

Create an application data-access service implementing `ConstructorStorage`, for
example `FirebaseConstructorStorage`. The host initializes Firebase and provides
that service. Replace the IndexedDB provider with:

```ts
import { provideConstructorStorage } from 'constructor/core';
import { FirebaseConstructorStorage } from './data-access/firebase-constructor-storage';

// In the application's providers, after implementing the service above:
provideConstructorStorage(FirebaseConstructorStorage)
```

This is registration guidance; no Firebase adapter or SDK is currently included.
Register one storage adapter at the application level. The service must itself be
provided, for example with `@Injectable({ providedIn: 'root' })`; this helper uses
`useExisting`, sharing the host's service instance.

The host owns Firebase configuration, authentication, user-scoped access,
authorization rules, and mapping remote data to the contract. The adapter must
handle concurrent visit updates and document/visit deletion consistently. Decide
how to store embedded image assets and how saves behave during connection loss
before enabling remote persistence. The current contract uses explicit Promise
reads and writes; realtime subscriptions and automatic local-to-cloud migration
would be separate features.

Source-CV initialization (`CONSTRUCTOR_SOURCE`), route query parameters, editor
events, and portable design import/export remain independent of this provider.
Switching providers changes where designs are saved; it does not transfer existing
local designs automatically.
