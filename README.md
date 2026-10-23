# CV Builder

<a href="https://app.netlify.com/projects/cv-builder-2/deploys">
  <img align="right" src="https://api.netlify.com/api/v1/badges/07e08a3f-ff78-458d-a4a8-72afa5ee6c71/deploy-status" alt="Netlify Status" />
</a>

[Open CV Builder](https://cv-builder-2.netlify.app/)

A simple Angular app for creating and customizing your CV, previewing changes,
saving CVs in your browser, and exporting them as PDFs.

The app runs completely client-side. Your CV data and photos stay in your browser
and are never sent to a server. Saving and PDF generation happen locally.

## Project notes

### Visual constructor

Open **Constructor** in the header to manage visual designs. Use **Open in
constructor** from a CV preview to create an independent, editable design with
Fabric.js. Designs support movable text and images, gradients, drawing tools,
alignment, layers and multiple pages. PDF export preserves text and clickable
links. Editable design files provide separate portable backups.

See [Constructor architecture](docs/CONSTRUCTOR.md) for extension points, storage,
conversion and export details.

### Feature folders

Feature code lives under `src/app/features/<feature>/`, grouped by responsibility:

- `components/`: components with their templates, styles, and tests.
- `services/`: injectable services and their closely related declarations.
- `interfaces/`: files containing domain types only.
- `constants/`: lookup data and related types.
- `helpers/`: functions, including files that combine functions and interfaces.

Tests stay beside the code they cover. Feature route definitions stay at the feature root.

### App version

Set `appVersion` in `src/environments/environment.ts` to change the version shown
in the footer. The same value is used for development and production builds.
The footer year comes from the current date.

### Saved CV storage

CV snapshots are stored locally in the browser's IndexedDB database, named
`cv-builder`. Photos are stored as files rather than base64 strings. Save, load,
and delete operations wait for their database transactions to complete.

Existing records under `cv-builder.saved-cvs.v1` in local storage are migrated
automatically. The original data is removed only after a successful transaction;
failed migrations retain the source and display a message. A migration marker
prevents old records from being reimported after deletion.

The home page displays estimated usage in MB and quota in GB from
`navigator.storage.estimate()`, when supported. These are estimates for the
whole site, not just its CV records; the browser controls the quota. If the API
is unavailable or fails, saving remains available and the estimate is marked
unavailable. Data stays in this browser profile and is removed if site data is cleared.

### Custom technology library and backups

In a technology selector, **Apply** adds a custom entry to the current CV or
experience. **Apply and save** also stores it in IndexedDB and makes it available
in every general and experience technology selector. Other multi-selects remain
independent. Names are deduplicated without regard to case; icons are optional.
An experience containing a technology without an icon uses comma-separated names.

ZIP backups include saved CVs, folders, experiences, and the technology library, including
uploaded icons. Older backups remain supported. Import merges records by ID;
the wipe option replaces all four libraries. All operations happen locally.

### CV folders

Use the folder-plus button beside the view switch to create a named folder.
Drag a saved CV onto a folder to move it there. Open a folder to view its CVs
in the currently selected card or list mode. Drop a CV on the area outside the
folder dialog to return it to the main list. Canceling a drag leaves it in place.
Folders have one level and only empty folders can be deleted. Folder membership
is preserved when a CV is edited and saved, and included in ZIP backups.

### Notifications and save feedback

See [Toast notifications and save feedback](docs/TOASTS.md).

### PDF export

Both Export actions generate an A4 PDF locally from `CvInfo` using pdfmake.
The exporter and bundled Roboto fonts load on demand. The browser distributions
of pdfmake and html-to-pdfmake are CommonJS, explicitly allowed in `angular.json`.
No CV data is sent to a server.

`features/cv/helpers/cv-pdf-document.ts` owns PDF layout, theme colors, image conversion,
and rich-text conversion. Keep it aligned with document theme changes. Rich text
preserves semantic formatting (bold, italic, underline, lists, and safe links);
embedded HTML images and arbitrary HTML styles are not imported. Portraits and
technology icons are embedded separately. PDF text remains selectable.

The live preview remains HTML. PDF pagination is handled independently by pdfmake;
Roboto typography and solid accent text can differ from the preview's system fonts
and gradient headings. The existing browser-print styles still support manual printing.

## Angular CLI reference

### Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

### Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

### Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

### Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

### Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

### Additional resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
