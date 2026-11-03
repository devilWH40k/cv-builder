# JoyrideTarget

Registers a named element for Joyride walkthrough steps. Use unique target names within the active view.

Selector: `[uiJoyrideTarget]`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `uiJoyrideTarget` | `string` | **Required** |

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { JoyrideTarget } from 'angular-shared-ui/joyride';
```

Add `JoyrideTarget` to the parent component's `imports`.

```html
<button uiJoyrideTarget="save">Save</button>
```
