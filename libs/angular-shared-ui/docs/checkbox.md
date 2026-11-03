# Checkbox

A labeled boolean reactive-form control with optional help text. Disable it through its FormControl.

Selector: `app-checkbox`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `control` | `FormControl<boolean>` | **Required** |
| `inputId` | `string` | **Required** |
| `label` | `string` | **Required** |
| `helpText` | `string` | `''` |

Use a typed `FormControl` with the documented value type. Disabled, touched, and validation state come from that control. `required` displays the required marker; add `Validators.required` to the control when validation is needed.

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { FormControl } from '@angular/forms';
import { Checkbox } from 'angular-shared-ui/checkbox';
```

Add `Checkbox` to the parent component's `imports`.

Parent class members:

```ts
readonly updates = new FormControl(false, { nonNullable: true });
```

```html
<app-checkbox inputId="updates" label="Receive updates" [control]="updates" />
```
