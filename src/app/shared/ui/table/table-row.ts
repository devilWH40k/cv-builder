import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-table-row',
  template: '<ng-content />',
  styleUrl: './table-row.scss',
  host: { role: 'row' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableRow {}
