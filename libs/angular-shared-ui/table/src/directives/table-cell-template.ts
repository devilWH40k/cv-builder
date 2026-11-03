import { Directive, inject, input, TemplateRef } from '@angular/core';
import { TableCellContext } from '../models/table-column';

@Directive({ selector: 'ng-template[uiTableCell]' })
export class TableCellTemplate<T> {
  /** Empty matches all columns without a more specific template. */
  readonly uiTableCell = input('');
  readonly tableCellOf = input.required<readonly T[]>();
  readonly template = inject<TemplateRef<TableCellContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _directive: TableCellTemplate<T>, context: unknown
  ): context is TableCellContext<T> {
    return true;
  }
}
