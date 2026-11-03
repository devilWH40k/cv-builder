# Dialog

A modal shell providing focus handling, backdrop/Escape dismissal, and projected body/actions. Create it conditionally and remove it when dismissed.

Selector: `app-dialog`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `dialogId` | `string` | **Required** |
| `title` | `string` | **Required** |
| `wide` | `boolean` | `false` |
| `fullHeight` | `boolean` | `false` |
| `minHeight` | `string` | `'0px'` |
| `busy` | `boolean` | `false` |
| `showClose` | `boolean` | `true` |
| `showTitle` | `boolean` | `true` |
| `backdropDropType` | `string` | `''` |

Project footer actions with `dialogActions` and header actions with `dialogHeaderActions`. `backdropDropType` enables matching shared drag items on the backdrop; `backdropDropped` emits `{ type, id }`. `contextRequested` forwards overlay context-menu requests.

## Outputs

| Output | Payload |
| --- | --- |
| `dismissed` | `void` |
| `backdropDropped` | `DragItem` |
| `contextRequested` | `MouseEvent` |

## Example

```ts
import { signal } from '@angular/core';
import { Dialog } from 'angular-shared-ui/dialog';
import { Button } from 'angular-shared-ui/button';
```

Add `Dialog, Button` to the parent component's `imports`.

Parent class members:

```ts
readonly open = signal(true);
```

```html
@if (open()) {
  <app-dialog dialogId="details" title="Details" (dismissed)="open.set(false)">
    <p>Dialog body</p>
    <app-button dialogActions (click)="open.set(false)">Done</app-button>
  </app-dialog>
}
```
