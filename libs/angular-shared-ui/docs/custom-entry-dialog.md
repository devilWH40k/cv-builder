# CustomEntryDialog

A reusable modal for adding a name and optional SVG icon. Its asynchronous saveEntry callback enables Apply and save; the dialog does not own storage.

Selector: `ui-custom-entry-dialog`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `inputId` | `string` | **Required** |
| `saveEntry` | `((entry: CustomEntry) => Promise<CustomEntry>) \| null` | `null` |
| `saveOnApply` | `boolean` | `false` |

## Outputs

| Output | Payload |
| --- | --- |
| `applied` | `CustomEntry` |
| `cancelled` | `void` |

## Example

```ts
import { signal } from '@angular/core';
import { CustomEntryDialog } from 'angular-shared-ui/custom-entry-dialog';
```

Add `CustomEntryDialog` to the parent component's `imports`.

Parent class members:

```ts
readonly open = signal(true);
readonly name = signal('');
```

```html
@if (open()) {
  <ui-custom-entry-dialog inputId="custom-skill" (applied)="name.set($event.name); open.set(false)" (cancelled)="open.set(false)" />
}
```
