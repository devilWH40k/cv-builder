# PhotoPreview

A modal photo crop/preview editor. Mount it while editing and remove it after applied or cancelled. The applied event contains the resulting File.

Selector: `ui-photo-preview`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `file` | `File` | **Required** |
| `shapes` | `readonly PhotoCropShape[]` | `['circle']` |
| `circularOutput` | `boolean` | `false` |

## Outputs

| Output | Payload |
| --- | --- |
| `applied` | `File` |
| `cancelled` | `void` |

## Example

```ts
import { PhotoPreview } from 'angular-shared-ui/photo-preview';
```

Add `PhotoPreview` to the parent component's `imports`.

Parent class members:

```ts
readonly photo = signal<File | null>(null);
readonly result = signal<File | null>(null);
```

```html
@if (photo(); as file) {
  <ui-photo-preview [file]="file" [shapes]="['circle', 'rectangle']" (applied)="result.set($event); photo.set(null)" (cancelled)="photo.set(null)" />
}
```
