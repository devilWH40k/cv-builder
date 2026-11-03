# Table

A low-level accessible table container. columns is a CSS grid-template-columns expression shared by its rows; use TableWrapper for data-driven tables.

Selector: `ui-table`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `label` | `string` | **Required** |
| `columns` | `string` | **Required** |
| `minWidth` | `string` | `'0px'` |

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { Table, TableHeader, TableRow, TableCell } from 'angular-shared-ui/table';
```

Add `Table, TableHeader, TableRow, TableCell` to the parent component's `imports`.

```html
<ui-table label="People" columns="1fr">
  <ui-table-header [headers]="['Name']" />
  <ui-table-row><ui-table-cell>Alex</ui-table-cell></ui-table-row>
</ui-table>
```
