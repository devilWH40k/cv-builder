# DialogOverlay

Focus/inertness and backdrop behavior for a native dialog. Call open() and close() on the directive reference; load the global overlay styles.

Selector: `dialog[appDialogOverlay]`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `backdropDropType` | `string` | `''` |

## Outputs

| Output | Payload |
| --- | --- |
| `backdropDropped` | `DragItem` |

## Example

```ts
import { DialogOverlay } from 'angular-shared-ui/dialog';
```

Add `DialogOverlay` to the parent component's `imports`.

```html
<dialog appDialogOverlay>Dialog content</dialog>
```

Open it after rendering from the parent:

```ts
import { afterNextRender, viewChild } from '@angular/core';

private readonly overlay = viewChild.required(DialogOverlay);

constructor() {
  afterNextRender(() => this.overlay().open());
}
```

`close()` restores focus and background interaction. Prefer Dialog when a title and actions are needed.
