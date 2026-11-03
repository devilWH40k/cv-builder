# TableRow

A low-level accessible table row projecting TableCell children. Inherits its grid dimensions from Table.

Selector: `app-table-row`.

## Inputs

None.

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { TableRow, Table, TableCell } from 'angular-shared-ui/table';
```

Add `TableRow, Table, TableCell` to the parent component's `imports`.

```html
<app-table label="People" columns="1fr">
  <app-table-row><app-table-cell>Alex</app-table-cell></app-table-row>
</app-table>
```
