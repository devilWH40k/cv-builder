import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';

export type LeaveCreateDecision = 'save' | 'leave' | 'cancel';

@Component({
  selector: 'app-leave-create-dialog',
  imports: [Button, Dialog],
  templateUrl: './leave-create-dialog.html',
  styleUrl: './leave-create-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeaveCreateDialog {
  readonly busy = input(false);
  readonly error = input('');
  readonly decision = output<LeaveCreateDecision>();
}
