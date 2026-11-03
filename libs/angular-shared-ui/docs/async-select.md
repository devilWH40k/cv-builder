# AsyncSelect

An editable combobox that filters supplied suggestions while allowing custom text. The host owns asynchronous loading and errors.

Selector: `app-async-select`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `control` | `FormControl<string>` | **Required** |
| `label` | `string` | **Required** |
| `inputId` | `string` | **Required** |
| `required` | `boolean` | `false` |
| `options` | `readonly string[]` | `[]` |
| `loading` | `boolean` | `false` |
| `helpText` | `string` | `''` |
| `emptyText` | `string` | `'No matching suggestions. You can enter your own value.'` |

Use a typed `FormControl` with the documented value type. Disabled, touched, and validation state come from that control. `required` displays the required marker; add `Validators.required` to the control when validation is needed.

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { FormControl } from '@angular/forms';
import { AsyncSelect } from 'angular-shared-ui/async-select';
```

Add `AsyncSelect` to the parent component's `imports`.

Parent class members:

```ts
readonly city = new FormControl('', { nonNullable: true });
```

```html
<app-async-select inputId="city" label="City" [control]="city" [options]="['Kyiv', 'Lviv']" />
```
