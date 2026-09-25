import { ChangeDetectionStrategy, Component, inject, PendingTasks, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Plus, FileText, Trash2 } from 'lucide-angular';
import { SavedCvs } from '../cv/saved-cvs';
import { CvDraft } from '../cv/cv-draft';

@Component({
  selector: 'app-home',
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {
  protected readonly PlusIcon = Plus;
  protected readonly DeleteIcon = Trash2;
  protected readonly deleteError = signal('');
  protected readonly FileIcon = FileText;
  protected readonly saved = inject(SavedCvs);
  private readonly pendingTasks = inject(PendingTasks);
  protected readonly deletingIds = signal<readonly string[]>([]);
  private readonly draft = inject(CvDraft);

  constructor() { this.pendingTasks.run(() => this.saved.refresh()); }

  protected async deleteCv(id: string): Promise<void> {
    if (this.deletingIds().includes(id)) return;
    const done = this.pendingTasks.add();
    this.deletingIds.update((ids) => [...ids, id]);
    this.deleteError.set('');
    try {
      await this.saved.delete(id);
      if (this.draft.savedId() === id) this.draft.reset();
    } catch {
      this.deleteError.set('Could not delete this CV. Browser storage may be unavailable. Please try again.');
    } finally {
      this.deletingIds.update((ids) => ids.filter((item) => item !== id));
      done();
    }
  }

  protected startNew(): void { this.draft.reset(); }
}
