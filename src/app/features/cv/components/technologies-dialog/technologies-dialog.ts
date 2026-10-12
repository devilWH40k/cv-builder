import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { LucideAngularModule, Plus, Trash2, X } from 'lucide-angular';
import { CustomEntry, CustomEntryDialog } from '../../../../core/dialogs/custom-entry-dialog/custom-entry-dialog';
import { Button } from '../../../../shared/ui/button/button';
import { DialogOverlay } from '../../../../shared/ui/dialog/dialog-overlay';
import { SavedCvs } from '../../services/saved-cvs';

@Component({
  selector: 'app-technologies-dialog',
  imports: [DialogOverlay, LucideAngularModule, CustomEntryDialog, Button],
  templateUrl: './technologies-dialog.html',
  styleUrl: './technologies-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TechnologiesDialog {
  protected readonly saved = inject(SavedCvs);
  protected readonly loading = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly error = signal('');
  protected readonly deletingIds = signal<readonly string[]>([]);
  protected readonly DeleteIcon = Trash2;
  protected readonly CloseIcon = X;
  protected readonly AddIcon = Plus;
  protected readonly adding = signal(false);
  protected readonly saveEntry = (entry: CustomEntry): Promise<CustomEntry> => this.saved.saveTechnology(entry);
  private readonly overlay = viewChild.required(DialogOverlay);
  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly addButton = viewChild.required<Button, ElementRef<HTMLElement>>('addButton', { read: ElementRef });

  open(): void {
    this.overlay().open();
    void this.load();
  }

  protected close(): void { this.overlay().close(); }

  protected add(): void {
    this.overlay().close();
    this.adding.set(true);
  }

  protected finishAdding(): void {
    this.adding.set(false);
    this.overlay().open();
    this.addButton().nativeElement.querySelector('button')?.focus();
  }

  protected async load(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.loadFailed.set(false);
    this.error.set('');
    try {
      await this.saved.loadTechnologies();
    } catch {
      this.loadFailed.set(true);
      this.error.set('Saved technologies could not be loaded. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async remove(id: string): Promise<void> {
    if (this.deletingIds().includes(id)) return;
    this.closeButton().nativeElement.focus();
    this.deletingIds.update((ids) => [...ids, id]);
    this.error.set('');
    try {
      await this.saved.deleteTechnology(id);
    } catch {
      this.error.set('This technology could not be deleted. Please try again.');
    } finally {
      this.deletingIds.update((ids) => ids.filter((entry) => entry !== id));
    }
  }
}
