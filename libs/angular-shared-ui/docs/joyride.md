# Joyride

A guided walkthrough that highlights registered JoyrideTarget elements. Mount it conditionally and remove it after finished; stepChanged emits the current zero-based index.

Selector: `app-joyride`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `steps` | `readonly JoyrideStep[]` | **Required** |

## Outputs

| Output | Payload |
| --- | --- |
| `stepChanged` | `number` |
| `finished` | `void` |

## Example

```ts
import { signal } from '@angular/core';
import { Joyride, JoyrideTarget } from 'angular-shared-ui/joyride';
```

Add `Joyride, JoyrideTarget` to the parent component's `imports`.

Parent class members:

```ts
readonly tourOpen = signal(true);
readonly steps = [{ target: 'save', title: 'Save your work', description: 'Use this button to save.' }];
```

```html
<button appJoyrideTarget="save">Save</button>
@if (tourOpen()) {
  <app-joyride [steps]="steps" (finished)="tourOpen.set(false)" />
}
```
