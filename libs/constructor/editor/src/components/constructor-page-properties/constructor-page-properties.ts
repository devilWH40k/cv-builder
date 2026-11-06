import { DebouncedColor } from 'angular-shared-ui/directives';
import { Button } from 'angular-shared-ui/button';
import { ToastService } from 'angular-shared-ui/toast';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule, ImagePlus, Trash2 } from 'lucide-angular';
import { ConstructorEditor } from '../../services/constructor-editor';

@Component({
  selector: 'lib-constructor-page-properties',
  imports: [DebouncedColor,Button, LucideAngularModule],
  templateUrl: './constructor-page-properties.html',
  styleUrl: './constructor-page-properties.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructorPageProperties {
  protected readonly editor = inject(ConstructorEditor);
  private readonly toasts = inject(ToastService);
  protected readonly ImageIcon = ImagePlus;
  protected readonly RemoveIcon = Trash2;

  protected async upload(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      await this.editor.setBackgroundImage(file);
    } catch (error: unknown) {
      this.toasts.show('danger', error instanceof Error ? error.message : 'The background image could not be loaded.');
    }
  }
}
