import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-table-row',
  template: '<ng-content />',
  styleUrl: './table-row.scss',
  host: { role: 'row' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableRow {}
