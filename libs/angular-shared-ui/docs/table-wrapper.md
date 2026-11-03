# TableWrapper

A typed table with column templates, optional search/visibility controls, loading and empty states, and optional Router query-parameter synchronization.

Selector: `app-table-wrapper`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `tableId` | `string` | **Required** |
| `label` | `string` | **Required** |
| `data` | `readonly T[]` | **Required** |
| `columns` | `readonly TableColumn<T>[]` | **Required** |
| `trackBy` | `(record: T) => string \| number` | **Required** |
| `settings` | `TableSettings` | `{}` |
| `loading` | `boolean` | `false` |

`TableColumn<T>` defines `key`, `label`, an optional `value(record)` function, `minWidth` (rem), `grow`, `hideable`, `initiallyVisible`, `searchable`, and `stickyRight`. `TableSettings` supports `search`, `columnVisibility`, `externalSearch`, `queryParams`, `searchLabel`, `emptyMessage`, and `noResultsMessage`. Enable `queryParams` only in a routed host; its string value overrides the tableId parameter prefix. With `externalSearch`, handle `searchChanged` and supply the filtered data from the host.

## Outputs

| Output | Payload |
| --- | --- |
| `searchChanged` | `TableSearch` |

## Example

```ts
import { TableWrapper } from 'angular-shared-ui/table';
```

Add `TableWrapper` to the parent component's `imports`.

Parent class members:

```ts
readonly people = [{ id: 1, name: 'Alex' }];
readonly columns = [{ key: 'name', label: 'Name', value: (person: { name: string }) => person.name }];
readonly trackPerson = (person: { id: number }) => person.id;
```

```html
<app-table-wrapper tableId="people" label="People" [data]="people" [columns]="columns" [trackBy]="trackPerson" [settings]="{ search: true }" />
```
