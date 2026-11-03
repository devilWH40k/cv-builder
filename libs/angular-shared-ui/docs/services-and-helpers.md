# Services and helpers

These declarations are exported from `angular-shared-ui`, except `svgVector`,
which is exported from `angular-shared-ui/svg`. Injectable services use root
providers, so consumers share one instance without additional providers.

## ToastService

`show(theme, message): number` appends a notification and returns its ID. Themes
are `success`, `danger`, and `alert`. Success notifications expire after five
seconds; other themes remain until dismissed. The queue holds up to five items.
`messages` is a readonly signal of `ToastMessage` records (`id`, `theme`, `message`).
`dismiss(id)`, `pause(id)`, and `resume(id)` manage the notification lifecycle.
Mount one [Toasts](toasts.md) outlet in the application.

```ts
import { inject } from '@angular/core';
import { ToastService } from 'angular-shared-ui/toast';

readonly toasts = inject(ToastService);
// After saving:
// this.toasts.show('success', 'Saved');
```

## DeleteConfirmationService

`confirm(request, owner: DestroyRef): Promise<boolean>` opens the shared
confirmation dialog. The request contains `title`, `itemName`, and optional
`message`. Cancellation, owner destruction, or an already active confirmation
resolves to false. The service only asks for confirmation; the host owns deletion.

```ts
import { DestroyRef, inject } from '@angular/core';
import { DeleteConfirmationService } from 'angular-shared-ui/delete-confirmation';

private readonly confirmations = inject(DeleteConfirmationService);
private readonly destroyRef = inject(DestroyRef);

async confirmRemoval(): Promise<boolean> {
  return this.confirmations.confirm({ title: 'Delete file?', itemName: 'Draft' }, this.destroyRef);
}
```

## DragDrop

Shared pointer drag state and target registration used by [Draggable](draggable.md),
[DropTarget](drop-target.md), and dialog backdrops. `DragItem` has `type` and `id`.
Prefer the wrapper/directive APIs for normal use. Custom drop zones can register
a `DropZone` with `element`, `accepts(item)`, and `dropped(item)`; invoke the returned
cleanup function when the zone is destroyed. The service handles preview cleanup,
pointer cancellation, and Escape; host features own domain mutations.

## JoyrideTargets

Registry backing [JoyrideTarget](joyride-target.md) and [Joyride](joyride.md).
Prefer the target directive for declarative registration. Target names match
the `target` field of `JoyrideStep` (`target`, `title`, `description`).

## FormField<T>

Abstract directive base for typed reactive form controls. Required inputs are
`control: FormControl<T>`, `label: string`, and `inputId: string`; optional
`required` defaults to false. Derived controls receive reactive value, disabled,
touched/invalid, and valid/dirty state, including when the control input changes.
Use it when adding a related library field; do not mount the base directly.

## Dates and validation

- `DateMode`: `year`, `month-year`, or `day-month-year`.
- `DateViewMode`: `day`, `month`, or `year`.
- `parseCalendarDate(value): Date | null` parses a calendar date.
- `formatCalendarDate(value): string` formats a full date for display.
- `imageFileValidator(control)` validates JPG/PNG image uploads.
- `companyLogoFileValidator(control)` validates image and SVG logo uploads.

```ts
import { FormControl } from '@angular/forms';
import { imageFileValidator } from 'angular-shared-ui/file-upload';

readonly photo = new FormControl<File | null>(null, { validators: [imageFileValidator] });
```

## Entry icons and SVG

`CustomEntry` is `{ readonly name: string; readonly icon?: string }`.
`CustomEntryIcons` is a readonly name-to-icon map. `entryIcon(icons, name)` safely
looks up an own property. `normalizeEntryIcon(file, applyMainColor = false)`
validates an SVG up to 5 MB, fits it to a 96px square, optionally applies the brand
paint, and resolves to a data URI. Invalid content rejects with an error for the
host to display. It dynamically imports the SVG entry point and Fabric.

```ts
import { normalizeEntryIcon } from 'angular-shared-ui/custom-entry-dialog';

async function readIcon(file: File): Promise<string> {
  return normalizeEntryIcon(file);
}
```

`svgVector(source, width, height, color?, invert?)` is an advanced Fabric helper
that returns a vector object or null for unsupported SVG. It rejects embedded or
external resources and preserves viewport whitespace. Import it dynamically when
it is only needed during an editing operation:

```ts
const { svgVector } = await import('angular-shared-ui/svg');
const vector = await svgVector('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" /></svg>', 96, 96);
```

## Tables, icons, and relative time

- `TableColumn<T>`, `TableSettings`, `TableSearch`, and `TableCellContext<T>`
  describe [TableWrapper](table-wrapper.md) data, configuration, and templates.
- `syncTableQueryParams(binding)` synchronizes search/column state in an injection
  context with a Router. `TableQueryBinding` describes the typed controls and
  column defaults. TableWrapper already manages this when `settings.queryParams`
  is enabled.
- `Tab`, `DropdownItem`, `ContextMenuItem`, `PhotoCropShape`, `ToastTheme`,
  `ToastMessage`, `MultiSelectGroup`, `DeleteConfirmationRequest`, and
  `UnsavedChangesDecision` accompany their respective components/services.
- `LayersArrowUp`, `LayerArrowUp`, `LayerArrowDown`, and `LayersArrowDown` are
  Lucide icon data used with `lucide-icon`. The source Lucide license is included
  in the package.
- `formatCompactRelativeTime(updatedAt, now?)` formats an epoch-millisecond
  timestamp as compact relative text. Pass `now` for deterministic formatting.
