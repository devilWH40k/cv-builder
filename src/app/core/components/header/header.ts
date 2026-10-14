import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CircleQuestionMark, Settings, LucideAngularModule } from 'lucide-angular';
import { BackupDialog } from '../../../features/cv/components/backup-dialog/backup-dialog';
import { TechnologiesDialog } from '../../../features/cv/components/technologies-dialog/technologies-dialog';
import { Dropdown, DropdownItem } from '../../../shared/ui/dropdown/dropdown';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, BackupDialog, TechnologiesDialog, Dropdown],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Header {
  protected readonly GuidesIcon = CircleQuestionMark;
  protected readonly SettingsIcon = Settings;
  protected readonly settingsItems: readonly DropdownItem[] = [
    { id: 'backup', label: 'Import / Export' },
    { id: 'experiences', label: 'Experiences' },
    { id: 'technologies', label: 'Technologies' }
  ];
  private readonly backup = viewChild.required(BackupDialog);
  private readonly technologies = viewChild.required(TechnologiesDialog);
  private readonly router = inject(Router);

  protected selectSetting(item: DropdownItem): void {
    if (item.id === 'backup') this.backup().open();
    if (item.id === 'technologies') this.technologies().open();
    if (item.id === 'experiences') void this.router.navigate(['/experiences']);
  }
}
