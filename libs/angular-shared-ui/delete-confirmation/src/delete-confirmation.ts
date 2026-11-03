import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from 'angular-shared-ui/button';
import { Dialog } from 'angular-shared-ui/dialog';

@Component({
  selector: 'app-delete-confirmation',
  imports: [Dialog, Button],
  templateUrl: './delete-confirmation.html',
  styleUrl: './delete-confirmation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteConfirmation {
  readonly title = input.required<string>();
  readonly itemName = input.required<string>();
  readonly message = input('This action cannot be undone.');
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
