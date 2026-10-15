import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-table-cell',
  template: '<ng-content />',
  styleUrl: './table-cell.scss',
  host: {
    '[attr.role]': 'header() ? "columnheader" : "cell"',
    '[class.sticky-right]': 'stickyRight()'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableCell {
  readonly header = input(false);
  readonly stickyRight = input(false);
}
