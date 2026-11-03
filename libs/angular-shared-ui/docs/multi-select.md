# MultiSelect

A searchable grouped multi-select with optional custom entries and SVG icons. A host-supplied save callback owns persistence.

Selector: `app-multi-select`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `control` | `FormControl<readonly string[]>` | **Required** |
| `label` | `string` | **Required** |
| `inputId` | `string` | **Required** |
| `required` | `boolean` | `false` |
| `groups` | `readonly MultiSelectGroup[]` | **Required** |
| `optionIcons` | `Readonly<Record<string, string \| undefined>>` | `{}` |
| `allowCustom` | `boolean` | `false` |
| `showIcons` | `boolean` | `true` |
| `customIcons` | `CustomEntryIcons` | `{}` |
| `savedEntries` | `readonly CustomEntry[]` | `[]` |
| `saveEntry` | `((entry: CustomEntry) => Promise<CustomEntry>) \| null` | `null` |

Use a typed `FormControl` with the documented value type. Disabled, touched, and validation state come from that control. `required` displays the required marker; add `Validators.required` to the control when validation is needed.

`control` holds `readonly string[]`. `groups` contains `{ label, options }` groups. `customIconsChange` emits the updated icon map; keep it in parent state. `saveEntry` receives `{ name, icon? }` and resolves with the saved entry.

## Outputs

| Output | Payload |
| --- | --- |
| `customIconsChange` | `CustomEntryIcons` |

## Example

```ts
import { FormControl } from '@angular/forms';
import { MultiSelect } from 'angular-shared-ui/multi-select';
```

Add `MultiSelect` to the parent component's `imports`.

Parent class members:

```ts
readonly skills = new FormControl<readonly string[]>([], { nonNullable: true });
readonly groups = [{ label: 'Languages', options: ['TypeScript', 'JavaScript'] }];
```

```html
<app-multi-select inputId="skills" label="Skills" [control]="skills" [groups]="groups" />
```
