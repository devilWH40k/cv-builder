# TableCell

A low-level table cell. header changes the ARIA role; stickyRight pins a final action column while scrolling.

Selector: `ui-table-cell`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `header` | `boolean` | `false` |
| `stickyRight` | `boolean` | `false` |

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { TableCell, Table, TableRow } from 'angular-shared-ui/table';
```

Add `TableCell, Table, TableRow` to the parent component's `imports`.

```html
<ui-table label="People" columns="1fr">
  <ui-table-row><ui-table-cell>Alex</ui-table-cell></ui-table-row>
</ui-table>
```
