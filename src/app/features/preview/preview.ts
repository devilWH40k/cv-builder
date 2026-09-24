import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Download, LucideAngularModule } from 'lucide-angular';
import { Button } from '../../shared/ui/button/button';
import { CvDraft } from '../cv/cv-draft';
import { formatCalendarDate } from '../../shared/ui/date-picker/date-value';

@Component({
  selector: 'app-preview',
  imports: [RouterLink, Button, LucideAngularModule],
  templateUrl: './preview.html',
  styleUrl: './preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Preview {
  protected readonly info = inject(CvDraft).current;
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly DownloadIcon = Download;
  protected readonly formatDate = formatCalendarDate;

  constructor() {
    effect((onCleanup) => {
      const photo = this.info()?.photo;
      if (!photo) {
        this.photoUrl.set(null);
        return;
      }
      const url = URL.createObjectURL(photo);
      this.photoUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }

  protected export(): void {
    window.print();
  }

  protected shortLevel(level: string): string {
    return level.split(' — ')[0];
  }
}
