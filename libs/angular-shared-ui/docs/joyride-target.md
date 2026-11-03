# JoyrideTarget

Registers a named element for Joyride walkthrough steps. Use unique target names within the active view.

Selector: `[appJoyrideTarget]`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `appJoyrideTarget` | `string` | **Required** |

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { JoyrideTarget } from 'angular-shared-ui/joyride';
```

Add `JoyrideTarget` to the parent component's `imports`.

```html
<button appJoyrideTarget="save">Save</button>
```
