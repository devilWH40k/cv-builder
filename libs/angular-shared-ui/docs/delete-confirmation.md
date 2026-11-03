# DeleteConfirmation

A modal confirmation prompt for destructive actions. The host performs deletion only after confirmed, then removes the dialog.

Selector: `app-delete-confirmation`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `title` | `string` | **Required** |
| `itemName` | `string` | **Required** |
| `message` | `string` | `'This action cannot be undone.'` |

## Outputs

| Output | Payload |
| --- | --- |
| `confirmed` | `void` |
| `cancelled` | `void` |

## Example

```ts
import { signal } from '@angular/core';
import { DeleteConfirmation } from 'angular-shared-ui/delete-confirmation';
```

Add `DeleteConfirmation` to the parent component's `imports`.

Parent class members:

```ts
readonly open = signal(true);
readonly confirmed = signal(false);
```

```html
@if (open()) {
  <app-delete-confirmation title="Delete file?" itemName="Draft" (confirmed)="confirmed.set(true); open.set(false)" (cancelled)="open.set(false)" />
}
```
