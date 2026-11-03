# Textarea

A labeled multiline reactive-form control with shared validation feedback.

Selector: `app-textarea`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `control` | `FormControl<string>` | **Required** |
| `label` | `string` | **Required** |
| `inputId` | `string` | **Required** |
| `required` | `boolean` | `false` |
| `rows` | `number` | `3` |

Use a typed `FormControl` with the documented value type. Disabled, touched, and validation state come from that control. `required` displays the required marker; add `Validators.required` to the control when validation is needed.

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { FormControl } from '@angular/forms';
import { Textarea } from 'angular-shared-ui/textarea';
```

Add `Textarea` to the parent component's `imports`.

Parent class members:

```ts
readonly notes = new FormControl('', { nonNullable: true });
```

```html
<app-textarea inputId="notes" label="Notes" [control]="notes" [rows]="5" />
```
