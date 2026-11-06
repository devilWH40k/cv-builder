import { DebouncedColor } from 'angular-shared-ui/directives';
import { ToastService } from 'angular-shared-ui/toast';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  LucideAngularModule,
  ImagePlus, RectangleHorizontal, Circle, Diamond, SquareRoundCorner,
  Bold,
  Italic,
  Copy,
  Trash2,
  Lock,
  LockKeyhole,
  Unlock,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-angular';
import { ConstructorEditor } from '../../services/constructor-editor';
import { safeDesignLink } from 'constructor/core';

@Component({
  selector: 'lib-constructor-properties',
  imports: [DebouncedColor,LucideAngularModule],
  templateUrl: './constructor-properties.html',
  styleUrl: './constructor-properties.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructorProperties {
  protected readonly editor = inject(ConstructorEditor);
  protected readonly icons = {
    ImagePlus, RectangleHorizontal, Circle, Diamond, SquareRoundCorner,
    Bold,
    Italic,
    Copy,
    Trash2,
    Lock,
    LockKeyhole,
    Unlock,
    ArrowUp,
    ArrowDown,
    AlignLeft,
    AlignCenter,
    AlignRight,
  };
  private readonly toasts = inject(ToastService);
  protected readonly invalidLink = signal(false);

  protected async replaceImage(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try { await this.editor.replaceImage(file); }
    catch (error: unknown) {
      this.toasts.show('danger', error instanceof Error ? error.message : 'The image could not be replaced.');
    }
  }

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
