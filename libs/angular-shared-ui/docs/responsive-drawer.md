# ResponsiveDrawer

A sidebar on wide screens that becomes a modal drawer on compact screens. Project navigation or actions into its body.

Selector: `ui-responsive-drawer`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `label` | `string` | **Required** |
| `panelId` | `string` | **Required** |
| `side` | `'left' \| 'right'` | `'left'` |

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { ResponsiveDrawer } from 'angular-shared-ui/responsive-drawer';
```

Add `ResponsiveDrawer` to the parent component's `imports`.

```html
<ui-responsive-drawer label="Navigation" panelId="navigation" side="left">
  <nav>Navigation content</nav>
</ui-responsive-drawer>
```
