# Tooltip

Shows accessible help on hover or focus. appTooltipLink optionally adds a safe internal route link; global library tooltip styles must be loaded.

Selector: `[appTooltip]`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `appTooltip` | `string` | **Required** |
| `appTooltipLink` | `string` | `''` |

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { Tooltip } from 'angular-shared-ui/directives';
```

Add `Tooltip` to the parent component's `imports`.

```html
<button appTooltip="Save the current document" appTooltipLink="/guides">Save</button>
```
