# UnsavedChangesDialog

A modal prompt with Save, Leave, and Cancel decisions. The host handles persistence, busy/error state, navigation, and removal of the prompt.

Selector: `app-unsaved-changes-dialog`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `subject` | `string` | `'CV'` |
| `dialogId` | `string` | `'leave-create'` |
| `busy` | `boolean` | `false` |
| `error` | `string` | `''` |

## Outputs

| Output | Payload |
| --- | --- |
| `decision` | `UnsavedChangesDecision` |

## Example

```ts
import { signal } from '@angular/core';
import { UnsavedChangesDialog } from 'angular-shared-ui/unsaved-changes-dialog';
```

Add `UnsavedChangesDialog` to the parent component's `imports`.

Parent class members:

```ts
readonly open = signal(true);
readonly decision = signal('');
```

```html
@if (open()) {
  <app-unsaved-changes-dialog subject="document" (decision)="decision.set($event); open.set(false)" />
}
```
