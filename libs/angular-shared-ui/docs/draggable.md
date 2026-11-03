# Draggable

A pointer-driven wrapper with a floating preview and cancellation handling. Pair it with DropTarget; features handle persistence after itemDropped.

Selector: `app-draggable`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `dragId` | `string` | **Required** |
| `dragType` | `string` | **Required** |
| `disabled` | `boolean` | `false` |

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { signal } from '@angular/core';
import { Draggable, DropTarget } from 'angular-shared-ui/draggable';
```

Add `Draggable, DropTarget` to the parent component's `imports`.

Parent class members:

```ts
readonly dropped = signal('');
```

```html
<app-draggable dragId="draft-1" dragType="document">Draft</app-draggable>
<section appDropTarget="document" (itemDropped)="dropped.set($event.id)">Drop here</section>
```
