import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableCell } from './table-cell';

@Component({
  selector: 'app-table-header',
  imports: [TableCell],
  template: '@for (header of headers(); track $index; let last = $last) { <app-table-cell [header]="true" [stickyRight]="stickyLastColumn() && last">{{ header }}</app-table-cell> }',
  styleUrls: ['./table-row.scss', './table-header.scss'],
  host: { role: 'row' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableHeader {
  readonly headers = input.required<readonly string[]>();
  readonly stickyLastColumn = input(false);
}
