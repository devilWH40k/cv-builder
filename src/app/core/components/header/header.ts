import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArrowDownUp, LucideAngularModule } from 'lucide-angular';
import { BackupDialog } from '../../../features/cv/backup-dialog/backup-dialog';

@Component({
  selector: 'app-header',
  imports: [RouterLink, LucideAngularModule, BackupDialog],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Header {
  protected readonly TransferIcon = ArrowDownUp;
}
