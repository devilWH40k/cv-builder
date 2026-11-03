import { UnsavedChangesDialog, UnsavedChangesDecision } from 'angular-shared-ui/unsaved-changes-dialog';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

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
