import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-table',
  template: '<ng-content />',
  styleUrl: './table.scss',
  host: {
    role: 'table',
    tabindex: '0',
    '[attr.aria-label]': 'label()',
    '[style.--table-columns]': 'columns()',
    '[style.--table-min-width]': 'minWidth()'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Table {
  readonly label = input.required<string>();
  readonly columns = input.required<string>();
  readonly minWidth = input('0px');
}
