import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UnsavedChangesDialog, UnsavedChangesDecision } from '../../../../shared/ui/unsaved-changes-dialog/unsaved-changes-dialog';

export type LeaveCreateDecision = UnsavedChangesDecision;

@Component({
  selector: 'app-leave-create-dialog',
  imports: [UnsavedChangesDialog],
  templateUrl: './leave-create-dialog.html',
  styleUrl: './leave-create-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LeaveCreateDialog {
  readonly busy = input(false);
  readonly error = input('');
  readonly decision = output<LeaveCreateDecision>();
}
