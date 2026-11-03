# Select

A labeled native select accepting either strings or value/label option objects.

Selector: `app-select`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `control` | `FormControl<string>` | **Required** |
| `label` | `string` | **Required** |
| `inputId` | `string` | **Required** |
| `required` | `boolean` | `false` |
| `options` | `readonly (string \| SelectOption)[]` | **Required** |

Use a typed `FormControl` with the documented value type. Disabled, touched, and validation state come from that control. `required` displays the required marker; add `Validators.required` to the control when validation is needed.

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { FormControl } from '@angular/forms';
import { Select } from 'angular-shared-ui/select';
```

Add `Select` to the parent component's `imports`.

Parent class members:

```ts
readonly size = new FormControl('Small', { nonNullable: true });
```

```html
<app-select inputId="size" label="Size" [control]="size" [options]="['Small', 'Large']" />
```
