# Constructor

Angular 20 library for the visual A4 editor, its design collection, rendering,
history, validation, persistence operations, CV-preview conversion, and PDF export.
Components use the `lib` prefix. Shared controls remain in `angular-shared-ui` with
the `ui` prefix. No constructor source imports application code.

## Entry points

| Import | Public API |
| --- | --- |
| `constructor/core` | Design models/constants, `blankDesign`, validation, `ConstructorRepository`, `DesignList`, and host integration tokens/providers |
| `constructor/indexeddb` | Optional `IndexedDbConstructorStorage` adapter and `provideConstructorIndexedDbStorage` |
| `constructor/resources` | On-demand fonts, file reading, and download helpers |
| `constructor/canvas` | Fabric adapters, metadata/serialization, shapes/effects, snapping, text resizing, visual styles, preview conversion |
| `constructor/editor` | `ConstructorPageComponent`, panels, menus, rulers, icon library, `ConstructorEditor`, `ConstructorSession`, tour, and clipboard |
| `constructor/pdf` | `buildDesignPdf` and `designPdfBlob` |

The root `constructor` entry point re-exports core. Internal imports use the
explicit entry points; the installed Rollup version mishandles an external module
named exactly `constructor` through its inherited `paths.constructor` property.
Keeping core separate also prevents Home's design collection from loading Fabric.
PDF and the Lucide icon catalogue continue loading on demand.

## Utility organization

Internal utilities use `utils/` directories, with tests beside the implementation:

| Location | Responsibility |
| --- | --- |
| `core/src/lib/utils/documents/` | Blank documents, validation, and safe document links |
| `core/src/lib/utils/` | Shared font catalogue |
| `canvas/src/utils/rendering/` | Canvas rendering and drag artwork caches |
| `canvas/src/utils/objects/` | Shape creation, effect shapes, and Fabric metadata |
| `canvas/src/utils/text/` | Textbox layout and selection text resizing |
| `canvas/src/utils/styles/` | Image effects and visual-style copying |
| `canvas/src/utils/scene/` | CV-preview conversion and scene restoration |
| `canvas/src/utils/` | Snapping geometry |
| `resources/src/utils/` | Font loading and file assets |
| `pdf/src/utils/` | PDF generation and vector-export tests |
| `indexeddb/src/utils/` | Transaction completion handling |

Consumers continue importing from public entry points such as `constructor/core`
and `constructor/canvas`; these internal paths do not change the exported APIs.

## App integration

The app's `/constructor` route lazily loads
`src/app/features/constructor/constructor-route.ts`. That wrapper renders
`lib-constructor-page`, projects the existing off-screen CV Preview, supplies the
app version, and forwards `canDeactivate()` to the editor's unsaved-change prompt.

The host supplies storage once, in its application providers:

```ts
import { provideConstructorIndexedDbStorage } from 'constructor/indexeddb';
import { CvDatabase } from './features/cv/services/cv-database';

// Add to application providers:
provideConstructorIndexedDbStorage(CvDatabase)
```

The optional IndexedDB adapter's `ConstructorIndexedDbDatabase` requires
`open(): Promise<IDBDatabase>`. The connection must
provide `constructor-designs` (key path `id`) and `metadata` stores. The host owns
schema migration and connection cleanup. This app reuses its existing CvDatabase;
saved designs and recent visits retain their original stores and keys.

Core's `ConstructorRepository` validates documents and delegates persistence to
`ConstructorStorage`, injected through `CONSTRUCTOR_STORAGE`. It does not access
IndexedDB. A remote adapter can implement the same six methods and register with
`provideConstructorStorage(MyStorage)` instead of the IndexedDB provider, without
changing the editor, session or design lists. See the [storage contract and future
Firebase integration](docs/storage.md) for method semantics and host responsibilities.

`CONSTRUCTOR_SOURCE` optionally supplies a `ConstructorSource` with
`load(id): Promise<{ title, sourceCvId, render } | null>` and `reset()`. Loading
must leave the preview unchanged; `render()` synchronously applies the loaded data
to an isolated preview projected using the `constructorPreview` attribute. The
editor checks that the request is still current before calling `render()`, waits
for layout, converts the DOM, then resets the source. This prevents slow, discarded
loads from overwriting a newer preview.
`ConstructorCvSource` in the app adapts `SavedCvs` and a local `CvDraft` without
modifying the original draft. Blank/saved designs work without this optional port.
`CONSTRUCTOR_VERSION` supplies the footer string and defaults to an empty string.

## Styles and assets

Load the shared UI global styles and apply the project's base reset/typography.
Constructor component styles import shared tokens and button mixins through
`angular-shared-ui/styles/...`; no application Sass files are required.

The library owns the thirteen licensed font families in `assets/fonts/` and its
walkthrough image. ng-packagr includes them in `dist/constructor/assets`. The app's
build/test assets configuration serves this directory at the site root, preserving
existing `/fonts/...` URLs. Other consumers should do the same. Bundled Roboto
continues loading from pdfmake. Assets are local; no font CDN is used.

## Development

From the workspace root:

```bash
npm start
npm run build
npm run test:constructor -- --watch=false --browsers=ChromeHeadless
npm run test:app -- --watch=false --browsers=ChromeHeadless
```

Startup waits for the shared UI watcher's first successful build, then the
constructor watcher's first successful build, and starts the dev server. Both
watchers remain active; Ctrl+C stops all three processes. During a shared UI
rebuild, the constructor watcher pauses and restarts after the dependency finishes,
so it never compiles against partially written package files. Server arguments such
as `npm start -- --port 4300` are forwarded to the dev server.
`npm run build:lib` builds both libraries in dependency order; `npm run build`
then builds the application. `npm test` builds the libraries and tests all three
projects. `npm run watch:constructor` watches only this library after shared UI
has been built.

Tests live beside their library code. App-specific database migration, CV preview
conversion, source isolation, and route integration tests stay under the app's
constructor feature. See [component reference](docs/components.md),
[storage adapters](docs/storage.md), and the
[constructor behavior and architecture](../../docs/CONSTRUCTOR.md) for details.
