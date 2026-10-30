import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Bold, Italic, Underline, ChevronDown, LucideAngularModule, LucideIconData } from 'lucide-angular';
import { ConstructorEditor } from '../../services/constructor-editor';
import { DESIGN_FONTS, loadDesignFamily } from '../../helpers/design-fonts';

@Component({
  selector: 'app-constructor-typography',
  imports: [LucideAngularModule],
  templateUrl: './constructor-typography.html',
  styleUrl: './constructor-typography.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructorTypography {
  protected readonly editor = inject(ConstructorEditor);
  protected readonly fonts = DESIGN_FONTS;
  protected readonly fontLoading = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toasts = inject(ToastService);

  protected async changeFont(family: string): Promise<void> {
    const selection = this.editor.selection()?.id;
    this.fontLoading.set(true);
    try {
      await loadDesignFamily(family);
      if (!this.destroyRef.destroyed && selection === this.editor.selection()?.id) this.editor.updateText({ fontFamily: family });
    } catch {
      if (!this.destroyRef.destroyed) this.toasts.show('danger', 'The local font could not be loaded. Please reload the page and try again.');
    } finally {
      if (!this.destroyRef.destroyed) this.fontLoading.set(false);
    }
  }
  protected updateNumeric(input: HTMLInputElement, key: 'fontSize' | 'charSpacing' | 'lineHeight'): void {
    const raw = input.value.trim().replace(',', '.');
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) {
      const value = Number(raw);
      if (Number.isFinite(value)) this.editor.updateText({ [key]: key === 'charSpacing' ? value * 1000 : value });
    }
    const selection = this.editor.selection();
    input.value = !selection || selection.mixed?.includes(key) ? '' : String(key === 'charSpacing' ? selection[key] / 1000 : selection[key]);
  }

  protected readonly FontArrowIcon = ChevronDown;
  protected readonly BoldIcon = Bold;
  protected readonly ItalicIcon = Italic;
  // Match the U letter height to Bold and Italic, retaining a separate underline.
  protected readonly UnderlineIcon: LucideIconData = Underline.map(([tag, attributes]) =>
    [tag, tag === 'line'
      ? { ...attributes, y1: '22', y2: '22' }
      : { ...attributes, d: 'M6 4v10a6 6 0 0 0 12 0V4' }],
  );
}
