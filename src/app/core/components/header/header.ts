import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CircleQuestionMark, LucideAngularModule, Moon, Sun } from 'lucide-angular';
import { ThemeStore } from '../../theme/theme-store';
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
  protected readonly themeStore = inject(ThemeStore);
  protected readonly SunIcon = Sun;
  protected readonly MoonIcon = Moon;
  protected readonly GuidesIcon = CircleQuestionMark;
}
