# Resizable

A square content wrapper with pointer and keyboard resizing. Sizes use unscaled CSS pixels and pointer interaction compensates for scaled previews.

Selector: `app-resizable`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `size` | `number` | **Required** |
| `minSize` | `number` | **Required** |
| `maxSize` | `number` | **Required** |
| `label` | `string` | `'Resize'` |
| `valueText` | `string` | `''` |
| `step` | `number` | `1` |

## Outputs

| Output | Payload |
| --- | --- |
| `sizeChange` | `number` |

## Example

```ts
import { signal } from '@angular/core';
import { Resizable } from 'angular-shared-ui/resizable';
```

Add `Resizable` to the parent component's `imports`.

Parent class members:

```ts
readonly size = signal(120);
```

```html
<app-resizable [size]="size()" [minSize]="80" [maxSize]="240" label="Photo size" (sizeChange)="size.set($event)">
  <span>Resizable content</span>
</app-resizable>
```
