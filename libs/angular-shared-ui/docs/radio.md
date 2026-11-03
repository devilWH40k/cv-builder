# Radio

A native radio choice controlled through checked/disabled inputs and a selected event.

Selector: `ui-radio`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `name` | `string` | **Required** |
| `value` | `string` | **Required** |
| `label` | `string` | **Required** |
| `checked` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |

## Outputs

| Output | Payload |
| --- | --- |
| `selected` | `void` |

## Example

```ts
import { signal } from '@angular/core';
import { Radio } from 'angular-shared-ui/radio';
```

Add `Radio` to the parent component's `imports`.

Parent class members:

```ts
readonly layout = signal('list');
```

```html
<ui-radio name="layout" value="list" label="List" [checked]="layout() === 'list'" (selected)="layout.set('list')" />
```
