import { inject, Injectable, PendingTasks, signal } from '@angular/core';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { CvDraft, CvInfo } from './cv-draft';
import { SavedCvs } from './saved-cvs';

@Injectable({ providedIn: 'root' })
export class SaveCv {
  private readonly draft = inject(CvDraft);
  private readonly saved = inject(SavedCvs);
  private readonly toasts = inject(ToastService);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly busy = signal(false);
  readonly saving = this.busy.asReadonly();

  async save(info: CvInfo | null): Promise<void> {
    if (this.busy()) return;
    if (!info) {
      this.toasts.show('alert', 'There is no CV to save yet.');
      return;
    }

    const session = this.draft.session();
    const previousDraft = this.draft.current();
    const savedId = this.draft.savedId();
    const done = this.pendingTasks.add();
    this.busy.set(true);
    try {
      const snapshot = structuredClone(info);
      const id = await this.saved.save(snapshot, savedId);
      if (this.draft.session() === session) {
        this.draft.savedId.set(id);
        if (this.draft.current() === previousDraft) this.draft.save(snapshot);
      }
      this.toasts.show(this.saved.error() ? 'alert' : 'success',
        this.saved.error()
          ? 'Your CV was saved, but the saved CV list could not be refreshed. Try reopening the home page.'
          : savedId ? 'Your CV has been updated.' : 'Your CV has been saved.');
    } catch (error: unknown) {
      this.toasts.show('danger',
        error instanceof DOMException && error.name === 'QuotaExceededError'
          ? 'Storage is full. Delete an unused CV or choose a smaller photo, then try saving again.'
          : 'Your CV could not be saved. Browser storage may be unavailable. Please try again.');
    } finally {
      this.busy.set(false);
      done();
    }
  }
}

