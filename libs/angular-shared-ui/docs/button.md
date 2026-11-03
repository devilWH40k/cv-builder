# Button

A native button wrapper with primary, monochrome, danger, and outline variants. Project text or Lucide icons into its content.

Selector: `app-button`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` |
| `disabled` | `boolean` | `false` |
| `variant` | `'primary' \| 'monochrome' \| 'danger' \| 'outline'` | `'primary'` |

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { Button } from 'angular-shared-ui/button';
```

Add `Button` to the parent component's `imports`.

```html
<app-button variant="outline">Continue</app-button>
```
