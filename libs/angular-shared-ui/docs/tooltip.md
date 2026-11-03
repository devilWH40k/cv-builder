# Tooltip

Shows accessible help on hover or focus. uiTooltipLink optionally adds a safe internal route link; global library tooltip styles must be loaded.

Selector: `[uiTooltip]`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `uiTooltip` | `string` | **Required** |
| `uiTooltipLink` | `string` | `''` |

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { Tooltip } from 'angular-shared-ui/directives';
```

Add `Tooltip` to the parent component's `imports`.

```html
<button uiTooltip="Save the current document" uiTooltipLink="/guides">Save</button>
```
