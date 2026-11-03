# Table

A low-level accessible table container. columns is a CSS grid-template-columns expression shared by its rows; use TableWrapper for data-driven tables.

Selector: `app-table`.

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
<app-table label="People" columns="1fr">
  <app-table-header [headers]="['Name']" />
  <app-table-row><app-table-cell>Alex</app-table-cell></app-table-row>
</app-table>
```
