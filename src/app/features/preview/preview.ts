import { SaveCvButton } from '../cv/save-cv-button';
import { USED_TECHNOLOGY_ICONS } from '../cv/used-technologies';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Download, LucideAngularModule } from 'lucide-angular';
import { Button } from '../../shared/ui/button/button';
import { CvDraft, DEFAULT_CV_STRUCTURE } from '../cv/cv-draft';
import { ResponsiveDrawer } from '../../shared/ui/responsive-drawer/responsive-drawer';
import { StructureOptions } from './structure-options/structure-options';
import { formatCalendarDate } from '../../shared/ui/date-picker/date-value';

@Component({
  selector: 'app-preview',
  imports: [SaveCvButton, RouterLink, Button, LucideAngularModule, StructureOptions, ResponsiveDrawer],
  templateUrl: './preview.html',
  styleUrl: './preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Preview {
  readonly embedded = input(false);
  protected readonly previewScale = signal(1);
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  private readonly destroyRef = inject(DestroyRef);
  protected readonly draft = inject(CvDraft);
  protected readonly info = this.draft.current;
  protected readonly structure = computed(() => ({ ...DEFAULT_CV_STRUCTURE, ...this.info()?.structure }));
  private readonly photo = computed(() => this.info()?.photo);
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly technologyIcons = USED_TECHNOLOGY_ICONS;
  protected readonly DownloadIcon = Download;
  protected readonly formatDate = formatCalendarDate;

  constructor() {
    afterNextRender(() => {
      if (!this.embedded()) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return;
      }
      const viewport = this.viewport()?.nativeElement;
      if (!viewport) return;
      const observer = new ResizeObserver(([entry]) => {
        // Fit the A4 sheet to the pane without changing document typography.
        if (entry.contentRect.width > 0) {
          this.previewScale.set(Math.min(1, entry.contentRect.width / (210 * 96 / 25.4)));
        }
      });
      observer.observe(viewport);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
    effect((onCleanup) => {
      const photo = this.photo();
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
