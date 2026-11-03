# TableCellTemplate

A typed projected cell template for TableWrapper. appTableCell selects a column key; an empty key is the fallback. tableCellOf provides the row type for template checking.

Selector: `ng-template[appTableCell]`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `appTableCell` | `string` | `''` |
| `tableCellOf` | `readonly T[]` | **Required** |

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { TableCellTemplate, TableWrapper } from 'angular-shared-ui/table';
```

Add `TableCellTemplate, TableWrapper` to the parent component's `imports`.

Parent class members:

```ts
readonly people = [{ id: 1, name: 'Alex' }];
readonly columns = [{ key: 'name', label: 'Name' }];
readonly trackPerson = (person: { id: number }) => person.id;
```

```html
<app-table-wrapper tableId="people" label="People" [data]="people" [columns]="columns" [trackBy]="trackPerson">
  <ng-template appTableCell="name" [tableCellOf]="people" let-person>
    <strong>{{ person.name }}</strong>
  </ng-template>
</app-table-wrapper>
```
