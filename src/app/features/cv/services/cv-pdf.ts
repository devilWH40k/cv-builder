import { inject, Injectable, signal } from '@angular/core';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { CvInfo } from './cv-draft';

@Injectable({ providedIn: 'root' })
export class CvPdf {
  private readonly busy = signal(false);
  readonly exporting = this.busy.asReadonly();
  private readonly toasts = inject(ToastService);

  async download(cv: CvInfo): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const { downloadCvPdf } = await import('../helpers/cv-pdf-document');
      await downloadCvPdf(cv);
    } catch {
      this.toasts.show('danger', 'Your PDF could not be exported. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
