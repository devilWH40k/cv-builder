# ExpandPanel

A collapsible section with a heading, optional count, and projected body.

Selector: `app-expand-panel`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `heading` | `string` | **Required** |
| `panelId` | `string` | **Required** |
| `count` | `number` | `0` |
| `initiallyExpanded` | `boolean` | `true` |

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { ExpandPanel } from 'angular-shared-ui/expand-panel';
```

Add `ExpandPanel` to the parent component's `imports`.

```html
<app-expand-panel heading="Education" panelId="education" [count]="2">
  <p>Section content</p>
</app-expand-panel>
```
