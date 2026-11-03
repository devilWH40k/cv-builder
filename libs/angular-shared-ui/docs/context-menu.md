# ContextMenu

A body-mounted context menu with keyboard navigation, viewport fitting, disabled actions, icons, and safe links. Call open(event) on the component reference.

Selector: `ui-context-menu`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `items` | `readonly ContextMenuItem[]` | **Required** |
| `label` | `string` | `'Context menu'` |
| `compact` | `boolean` | `false` |

## Outputs

| Output | Payload |
| --- | --- |
| `selected` | `string` |
| `opened` | `HTMLElement` |

## Example

```ts
import { signal } from '@angular/core';
import { ContextMenu } from 'angular-shared-ui/context-menu';
```

Add `ContextMenu` to the parent component's `imports`.

Parent class members:

```ts
readonly items = [{ id: 'open', label: 'Open' }];
readonly action = signal('');
```

```html
<section (contextmenu)="menu.open($event)">Right-click here</section>
<ui-context-menu #menu [items]="items" (selected)="action.set($event)" />
```
