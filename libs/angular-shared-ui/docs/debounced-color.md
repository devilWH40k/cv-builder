# DebouncedColor

Debounces native color input previews for 150ms, then flushes pending color changes on blur or outside interaction.

Selector: `input[type=color][appDebouncedColor]`.

## Inputs

None.

## Outputs

| Output | Payload |
| --- | --- |
| `colorCommitted` | `string` |

## Example

```ts
import { signal } from '@angular/core';
import { DebouncedColor } from 'angular-shared-ui/directives';
```

Add `DebouncedColor` to the parent component's `imports`.

Parent class members:

```ts
readonly color = signal('#36d4f7');
```

```html
<input type="color" appDebouncedColor [value]="color()" (colorCommitted)="color.set($event)" aria-label="Color" />
```
