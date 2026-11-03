# FileUpload

A reactive file picker with photo/icon previews, optional removal, and an additional action. Add file validators to the FormControl for the accepted content rules.

Selector: `ui-file-upload`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `control` | `FormControl<File \| null>` | **Required** |
| `label` | `string` | **Required** |
| `inputId` | `string` | **Required** |
| `required` | `boolean` | `false` |
| `actionLabel` | `string` | `''` |
| `actionDisabled` | `boolean` | `false` |
| `previewSource` | `string \| null \| undefined` | `undefined` |
| `removeLabel` | `string` | `'Remove file'` |
| `removable` | `boolean` | `false` |
| `mode` | `'photo' \| 'icon' \| 'file'` | `'photo'` |
| `accept` | `string` | `'.jpg,.jpeg,.png'` |
| `helpText` | `string` | `'JPG, JPEG or PNG'` |

Use a typed `FormControl` with the documented value type. Disabled, touched, and validation state come from that control. `required` displays the required marker; add `Validators.required` to the control when validation is needed.

## Outputs

| Output | Payload |
| --- | --- |
| `action` | `void` |

## Example

```ts
import { FormControl } from '@angular/forms';
import { FileUpload } from 'angular-shared-ui/file-upload';
```

Add `FileUpload` to the parent component's `imports`.

Parent class members:

```ts
readonly photo = new FormControl<File | null>(null);
```

```html
<ui-file-upload inputId="photo" label="Photo" [control]="photo" [removable]="true" />
```
