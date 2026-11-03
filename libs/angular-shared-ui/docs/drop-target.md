# DropTarget

Registers a drop zone with DragDrop for the accepted drag type. A matching hovered zone receives the drop-target class.

Selector: `[uiDropTarget]`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `uiDropTarget` | `string` | **Required** |
| `dropDisabled` | `boolean` | `false` |

## Outputs

| Output | Payload |
| --- | --- |
| `itemDropped` | `DragItem` |

## Example

```ts
import { signal } from '@angular/core';
import { DropTarget, Draggable } from 'angular-shared-ui/draggable';
```

Add `DropTarget, Draggable` to the parent component's `imports`.

Parent class members:

```ts
readonly dropped = signal('');
```

```html
<ui-draggable dragId="draft" dragType="document">Draft</ui-draggable>
<section uiDropTarget="document" (itemDropped)="dropped.set($event.id)">Drop here</section>
```
