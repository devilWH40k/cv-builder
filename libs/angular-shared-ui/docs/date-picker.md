# DatePicker

A reactive-form calendar supporting year, month/year, or complete date selection. Values use YYYY, YYYY-MM, or YYYY-MM-DD according to mode.

Selector: `app-date-picker`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `control` | `FormControl<string>` | **Required** |
| `label` | `string` | **Required** |
| `inputId` | `string` | **Required** |
| `required` | `boolean` | `false` |
| `mode` | `DateMode` | `'month-year'` |
| `startViewMode` | `DateViewMode` | `'month'` |
| `startFromDate` | `Date \| null` | `null` |

Use a typed `FormControl` with the documented value type. Disabled, touched, and validation state come from that control. `required` displays the required marker; add `Validators.required` to the control when validation is needed.

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { FormControl } from '@angular/forms';
import { DatePicker } from 'angular-shared-ui/date-picker';
```

Add `DatePicker` to the parent component's `imports`.

Parent class members:

```ts
readonly started = new FormControl('', { nonNullable: true });
```

```html
<app-date-picker inputId="started" label="Started" [control]="started" mode="month-year" />
```
