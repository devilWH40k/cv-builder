import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ChevronDown, ChevronUp, LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-expand-panel',
  imports: [LucideAngularModule],
  templateUrl: './expand-panel.html',
  styleUrl: './expand-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpandPanel {
  readonly heading = input.required<string>();
  readonly panelId = input.required<string>();
  readonly count = input(0);
  protected readonly expanded = signal(true);

  expand(): void {
    this.expanded.set(true);
  }

  protected readonly ChevronUpIcon = ChevronUp;
  protected readonly ChevronDownIcon = ChevronDown;
}
