import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  LucideAngularModule,
  Bold,
  Italic,
  Copy,
  Trash2,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-angular';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConstructorEditor } from '../../services/constructor-editor';
import { safeDesignLink } from '../../helpers/design-assets';

@Component({
  selector: 'app-constructor-properties',
  imports: [LucideAngularModule],
  templateUrl: './constructor-properties.html',
  styleUrl: './constructor-properties.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructorProperties {
  protected readonly editor = inject(ConstructorEditor);
  protected readonly icons = {
    Bold,
    Italic,
    Copy,
    Trash2,
    Lock,
    Unlock,
    ArrowUp,
    ArrowDown,
    AlignLeft,
    AlignCenter,
    AlignRight,
  };
  private readonly toasts = inject(ToastService);
  protected readonly invalidLink = signal(false);

  protected changeLink(value: string): void {
    this.invalidLink.set(false);
    try {
      this.editor.setLink(value);
    } catch (error: unknown) {
      this.invalidLink.set(true);
      this.toasts.show(
        'danger',
        error instanceof Error ? error.message : 'This link could not be applied.',
      );
    }
  }

  protected validLink(): string | null {
    return safeDesignLink(this.editor.selection()?.linkUrl ?? '');
  }

  protected async duplicate(): Promise<void> {
    try {
      await this.editor.duplicate();
    } catch {
      this.toasts.show('danger', 'The object could not be duplicated.');
    }
  }

}
