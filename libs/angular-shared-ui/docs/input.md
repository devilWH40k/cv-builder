# Input

A labeled typed reactive-form input with validation feedback, suggestions, and optional icons.

Selector: `app-input`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `control` | `FormControl<string>` | **Required** |
| `label` | `string` | **Required** |
| `inputId` | `string` | **Required** |
| `required` | `boolean` | `false` |
| `type` | `'text' \| 'email' \| 'tel' \| 'url' \| 'password'` | `'text'` |
| `autocomplete` | `string` | `'off'` |
| `helpText` | `string` | `''` |
| `suggestions` | `readonly string[]` | `[]` |
| `icon` | `LucideIconData` | `undefined` |
| `iconSrc` | `string` | `''` |

Use a typed `FormControl` with the documented value type. Disabled, touched, and validation state come from that control. `required` displays the required marker; add `Validators.required` to the control when validation is needed.

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { FormControl } from '@angular/forms';
import { Input } from 'angular-shared-ui/input';
```

Add `Input` to the parent component's `imports`.

Parent class members:

```ts
readonly name = new FormControl('', { nonNullable: true });
```

```html
<app-input inputId="name" label="Name" [control]="name" [required]="true" />
```
