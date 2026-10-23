import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, PenTool, Trash2 } from 'lucide-angular';
import { DesignSummary } from '../../interfaces/constructor-document';

@Component({
  selector: 'app-design-list',
  imports: [DatePipe, RouterLink, LucideAngularModule],
  templateUrl: './design-list.html',
  styleUrl: './design-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesignList {
  readonly designs = input.required<readonly DesignSummary[]>();
  readonly returnTab = input<'files' | 'designs' | null>(null);
  readonly recent = input(false);
  readonly deletingIds = input<readonly string[]>([]);
  readonly deleteRequested = output<DesignSummary>();
  protected readonly DesignIcon = PenTool;
  protected readonly DeleteIcon = Trash2;
}
