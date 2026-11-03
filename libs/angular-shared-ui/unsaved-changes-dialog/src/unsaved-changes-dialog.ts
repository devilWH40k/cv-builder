import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from 'angular-shared-ui/button';
import { Dialog } from 'angular-shared-ui/dialog';

export type UnsavedChangesDecision = 'save' | 'leave' | 'cancel';

@Component({
  selector: 'ui-unsaved-changes-dialog',
  imports: [Button, Dialog],
  templateUrl: './unsaved-changes-dialog.html',
  styleUrl: './unsaved-changes-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnsavedChangesDialog {
  readonly subject = input('CV');
  readonly dialogId = input('leave-create');
  readonly busy = input(false);
  readonly error = input('');
  readonly decision = output<UnsavedChangesDecision>();
}
