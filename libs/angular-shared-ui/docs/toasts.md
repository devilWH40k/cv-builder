# Toasts

The application-wide notification outlet backed by ToastService. Mount one outlet near the root so services and dialogs share the same queue.

Selector: `ui-toasts`.

## Inputs

None.

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { inject } from '@angular/core';
import { Toasts, ToastService } from 'angular-shared-ui/toast';
import { Button } from 'angular-shared-ui/button';
```

Add `Toasts, Button` to the parent component's `imports`.

Parent class members:

```ts
readonly toasts = inject(ToastService);
```

```html
<ui-button (click)="toasts.show('success', 'Saved')">Save</ui-button>
<ui-toasts />
```
