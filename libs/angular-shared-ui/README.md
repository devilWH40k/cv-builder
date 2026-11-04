# angular-shared-ui

Standalone Angular 20 components, directives, supporting services, and utilities.
Shared controls use `ui-*` component selectors and `ui...` directive selectors.
Application features import the public API from component entry points such as
`angular-shared-ui/button`. Relative
imports stay within an entry point; imports between entry points use package paths.
The root `angular-shared-ui` entry point also re-exports the complete API. Prefer
component entry points in applications with lazy routes to keep bundles separate.

## Development

From the workspace root:

```bash
npm install
npm start
```

`npm start` starts the library watcher and waits for its first successful build
before starting the constructor watcher; the application server starts after both libraries build successfully. Arguments such as `npm start -- --port 4300` are
forwarded to the server. Ctrl+C stops both processes. The watcher retains the
previous package during rebuilds (`deleteDestPath: false`) so the server can
continue resolving it. After deleting or renaming entry points, stop the watcher,
remove the generated `dist/angular-shared-ui` folder, and restart to clear stale files.

```bash
npm run build:shared-ui                   # this production package
npm run watch:lib                         # development package watcher
npm run build                            # library, then application
npm run test:lib -- --watch=false --browsers=ChromeHeadless
npm test -- --watch=false --browsers=ChromeHeadless  # all three projects
```

The Angular CLI uses `@angular/build:ng-packagr`, following Angular's
[library workflow](https://angular.dev/tools/libraries/creating-libraries).
Package output lives in `dist/angular-shared-ui`. The package declares its Angular,
RxJS, Lucide, and Fabric dependencies as peers; install them in consuming apps.
Fabric supports SVG icon normalization and is loaded on demand via the separate
`angular-shared-ui/svg` entry point.

## Using components

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Button } from 'angular-shared-ui/button';

@Component({
  selector: 'app-example',
  imports: [Button],
  template: '<ui-button variant="outline">Continue</ui-button>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Example {}
```

See the [component and directive reference](docs/README.md) for descriptions,
complete input/default tables, outputs, and usage examples for each control.
[Services and helpers](docs/services-and-helpers.md) covers the supporting APIs.

## Styles and themes

Load global library styles once in the consuming application's global stylesheet:

```scss
@use 'angular-shared-ui/styles';
```

These provide the light/dark CSS variables plus tooltip, drag preview, and dialog
overlay styles. Select dark mode with `data-theme="dark"` on the root element.
The library owns the Sass design tokens. The application's `src/styles/_tokens.scss`
forwards them so existing app Sass imports continue working.

```scss
@use 'angular-shared-ui/styles/tokens' as tokens;
@use 'angular-shared-ui/styles/button-variants' as buttons;

.action {
  @include buttons.secondary;
  margin: tokens.$spacing-2;
}
```

In this workspace, application Sass include paths contain `dist`; the library
package must be built before application compilation or tests. An installed
package resolves through `node_modules`. Components already contain their compiled
local styles. The library does not apply an application-wide reset or body font by
default. Use `@use 'angular-shared-ui/styles/reset';` before the global styles to
opt into the packaged reset, and set body typography using the design tokens.
Library tests use this setup in `src/test.scss`.

## Extending the library

- Keep components, templates, styles, and specs together in `<entry-point>/src/`.
- Put reusable directives in `directives/src/` and generic helpers in `utils/src/`.
- Keep feature storage and business rules in the app; pass callbacks to controls.
- Export public declarations from the entry point's `public-api.ts` and re-export
  the entry point from `src/public-api.ts`. Add documentation under `docs/`.
- Give new entry points their own `ng-package.json`; import other entry points by
  package name to retain single service instances and lazy loading.
- Run the library tests, app tests, and production build after changes.
- Do not import application code from the library.
