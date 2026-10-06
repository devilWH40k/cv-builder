import { Resizable } from '../../shared/ui/resizable/resizable';
import { CSS_PIXELS_PER_MM, CV_PHOTO_MIN_MM, CV_PHOTO_MAX_MM, cvPhotoSizeMm } from '../cv/cv-photo-size';
import { CvPdf } from '../cv/cv-pdf';
import { SaveCvButton } from '../cv/save-cv-button';
import { USED_TECHNOLOGY_ICONS, usedTechnologiesView } from '../cv/used-technologies';
import { afterNextRender, afterRenderEffect, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, viewChild, viewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Download, LucideAngularModule } from 'lucide-angular';
import { Button } from '../../shared/ui/button/button';
import { CvDraft, DEFAULT_CV_STRUCTURE } from '../cv/cv-draft';
import { ResponsiveDrawer } from '../../shared/ui/responsive-drawer/responsive-drawer';
import { StructureOptions } from './structure-options/structure-options';
import { formatCalendarDate } from '../../shared/ui/date-picker/date-value';

@Component({
  selector: 'app-preview',
  imports: [Resizable, SaveCvButton, RouterLink, Button, LucideAngularModule, StructureOptions, ResponsiveDrawer],
  templateUrl: './preview.html',
  styleUrls: ['./preview.scss', './preview-pages.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Preview {
  protected readonly pdf = inject(CvPdf);
  readonly embedded = input(false);
  private readonly pageCount = signal(1);
  protected readonly pages = computed(() => Array.from({ length: this.pageCount() }, (_, index) => index));
  private readonly pageFlows = viewChildren<ElementRef<HTMLElement>>('pageFlow');
  protected readonly previewScale = signal(1);
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  private readonly destroyRef = inject(DestroyRef);
  protected readonly draft = inject(CvDraft);
  protected readonly info = this.draft.current;
  protected readonly structure = computed(() => ({ ...DEFAULT_CV_STRUCTURE, ...this.info()?.structure }));
  protected readonly photoSizeMm = computed(() => cvPhotoSizeMm(this.structure().photoSizeMm));
  protected readonly photoSize = computed(() => this.photoSizeMm() * CSS_PIXELS_PER_MM);
  protected readonly minPhotoSize = CV_PHOTO_MIN_MM * CSS_PIXELS_PER_MM;
  protected readonly maxPhotoSize = CV_PHOTO_MAX_MM * CSS_PIXELS_PER_MM;
  protected readonly photoSizeStep = CSS_PIXELS_PER_MM;
  private readonly photo = computed(() => this.info()?.photo);
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly technologyIcons = USED_TECHNOLOGY_ICONS;
  protected readonly usedTechnologiesView = usedTechnologiesView;
  protected readonly DownloadIcon = Download;
  protected readonly formatDate = formatCalendarDate;

  constructor() {
    afterRenderEffect((onCleanup) => {
      this.info();
      const flow = this.pageFlows()[0]?.nativeElement;
      if (!flow) return;
      const measure = () => {
        const mm = 96 / 25.4;
        const count = Math.max(1, Math.ceil((flow.scrollWidth + 32 * mm - 1) / (210 * mm)));
        this.pageCount.set(count);
      };
      measure();
      const observer = new ResizeObserver(measure);
      for (const child of Array.from(flow.children)) observer.observe(child);
      onCleanup(() => observer.disconnect());
    });
    afterNextRender(() => {
      if (!this.embedded()) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return;
      }
      const viewport = this.viewport()?.nativeElement;
      if (!viewport) return;
      const observer = new ResizeObserver(([entry]) => {
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

  protected resizePhoto(size: number): void {
    const photoSizeMm = cvPhotoSizeMm(Math.round(size / CSS_PIXELS_PER_MM * 10) / 10);
    this.draft.updateStructure({ ...this.structure(), photoSizeMm });
  }

  protected export(): void {
    const cv = this.info();
    if (cv) void this.pdf.download(cv);
  }

  protected shortLevel(level: string): string {
    return level.split(' — ')[0];
  }
}
