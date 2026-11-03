# TableHeader

A low-level table header row rendering labels as columnheader cells. Place inside Table.

Selector: `ui-table-header`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `headers` | `readonly string[]` | **Required** |
| `stickyLastColumn` | `boolean` | `false` |

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { TableHeader, Table } from 'angular-shared-ui/table';
```

Add `TableHeader, Table` to the parent component's `imports`.

```html
<ui-table label="People" columns="1fr">
  <ui-table-header [headers]="['Name']" />
</ui-table>
```
