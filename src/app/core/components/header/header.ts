import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CircleQuestionMark, LucideAngularModule } from 'lucide-angular';
import { BackupDialog } from '../../../features/cv/components/backup-dialog/backup-dialog';
import { TechnologiesDialog } from '../../../features/cv/components/technologies-dialog/technologies-dialog';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, BackupDialog, TechnologiesDialog],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Header {
  protected readonly GuidesIcon = CircleQuestionMark;
}
