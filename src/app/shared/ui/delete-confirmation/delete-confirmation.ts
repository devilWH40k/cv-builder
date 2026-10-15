import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Dialog } from '../dialog/dialog';

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
