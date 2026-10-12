import { afterNextRender, ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';
import { DialogOverlay } from './dialog-overlay';
import { DragItem } from '../draggable/drag-drop';

@Component({
  selector: 'app-dialog',
  imports: [DialogOverlay, LucideAngularModule],
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dialog {
  readonly dialogId = input.required<string>();
  readonly title = input.required<string>();
  readonly wide = input(false);
  readonly minHeight = input('0px');
  readonly busy = input(false);
  readonly showClose = input(true);
  readonly backdropDropType = input('');
  readonly dismissed = output<void>();
  readonly backdropDropped = output<DragItem>();
  protected readonly CloseIcon = X;
  private readonly overlay = viewChild.required(DialogOverlay);

  constructor() {
    afterNextRender(() => this.overlay().open());
  }

  close(): void {
    if (this.busy()) return;
    this.overlay().close();
    this.dismissed.emit();
  }
}
