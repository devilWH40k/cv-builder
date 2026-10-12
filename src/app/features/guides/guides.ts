import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowLeft, LucideAngularModule } from 'lucide-angular';
import { ExpandPanel } from '../../shared/ui/expand-panel/expand-panel';

@Component({
  selector: 'app-guides',
  imports: [ExpandPanel, RouterLink, LucideAngularModule],
  templateUrl: './guides.html',
  styleUrl: './guides.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Guides {
  protected readonly ArrowLeftIcon = ArrowLeft;
}
