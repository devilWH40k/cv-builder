import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CircleCheck, CircleAlert, TriangleAlert, X, LucideAngularModule } from 'lucide-angular';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toasts',
  imports: [LucideAngularModule],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Toasts {
  protected readonly toasts = inject(ToastService);
  protected readonly icons = { success: CircleCheck, danger: CircleAlert, alert: TriangleAlert };
  protected readonly titles = { success: 'Success', danger: 'Error', alert: 'Attention' };
  protected readonly CloseIcon = X;

  protected resume(id: number, event: MouseEvent | FocusEvent): void {
    const element = event.currentTarget;
    if (!(element instanceof HTMLElement)) return;
    if (event instanceof FocusEvent) {
      if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
      if (element.matches(':hover')) return;
    } else if (element.matches(':focus-within')) {
      return;
    }
    this.toasts.resume(id);
  }
}

