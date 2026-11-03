# DropTarget

Registers a drop zone with DragDrop for the accepted drag type. A matching hovered zone receives the drop-target class.

Selector: `[appDropTarget]`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `appDropTarget` | `string` | **Required** |
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
<app-draggable dragId="draft" dragType="document">Draft</app-draggable>
<section appDropTarget="document" (itemDropped)="dropped.set($event.id)">Drop here</section>
```
