# ResizeHandle

A keyboard/pointer separator controlling an adjacent panel size in CSS pixels. Bind the size model to the panel dimension.

Selector: `app-resize-handle`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `size` | `number` | `280` |
| `axis` | `'horizontal' \| 'vertical'` | `'horizontal'` |
| `min` | `number` | `200` |
| `max` | `number` | `420` |
| `edge` | `'left' \| 'right'` | `'right'` |
| `label` | `string` | **Required** |

## Outputs

| Output | Payload |
| --- | --- |
| `sizeChange` | `number` |

## Example

```ts
import { signal } from '@angular/core';
import { ResizeHandle } from 'angular-shared-ui/resize-handle';
```

Add `ResizeHandle` to the parent component's `imports`.

Parent class members:

```ts
readonly width = signal(280);
```

```html
<aside [style.width.px]="width()">Panel</aside>
<app-resize-handle label="Panel width" [(size)]="width" [min]="200" [max]="420" />
```
