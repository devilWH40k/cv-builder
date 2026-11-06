import { ChangeDetectionStrategy, Component, computed, inject, input, output, viewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AngularTiptapEditorComponent, AteEditorCommandsService, AteEditorConfig } from '@flogeez/angular-tiptap-editor';
import { Input } from 'angular-shared-ui/input';
import { Bold, Italic, List, ListOrdered, LucideAngularModule, Redo2, Underline, Undo2, X } from 'lucide-angular';
import { ThemeStore } from '../../../../core/theme/theme-store';
import { createCustomBlockForm } from '../../helpers/cv-form';

@Component({
  selector: 'app-custom-block-entry',
  imports: [ReactiveFormsModule, Input, AngularTiptapEditorComponent, LucideAngularModule],
  templateUrl: './custom-block-entry.html',
  styleUrl: './custom-block-entry.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomBlockEntry {
  readonly form = input.required<ReturnType<typeof createCustomBlockForm>>();
  readonly index = input.required<number>();
  readonly remove = output<void>();
  private readonly themeStore = inject(ThemeStore);
  private readonly editor = viewChild(AngularTiptapEditorComponent);
  private readonly commands = viewChild(AngularTiptapEditorComponent, { read: AteEditorCommandsService });
  protected readonly XIcon = X;
  protected readonly formatting = [
    { label: 'Bold', icon: Bold, command: 'toggleBold' },
    { label: 'Italic', icon: Italic, command: 'toggleItalic' },
    { label: 'Underline', icon: Underline, command: 'toggleUnderline' },
    { label: 'Bullet list', icon: List, command: 'toggleBulletList' },
    { label: 'Numbered list', icon: ListOrdered, command: 'toggleOrderedList' },
    { label: 'Undo', icon: Undo2, command: 'undo' },
    { label: 'Redo', icon: Redo2, command: 'redo' }
  ] as const;
  protected readonly editorConfig = computed<AteEditorConfig>(() => ({
    locale: 'en', theme: this.themeStore.theme(), minHeight: 200, autofocus: false,
    placeholder: 'Add details for this section...',
    showToolbar: false, showEditToggle: false, showFooter: false, enableSlashCommands: false,
    showBubbleMenu: false, blockControls: 'none',
    tiptapOptions: {
      editorProps: {
        attributes: {
          'aria-label': 'Content for custom block ' + (this.index() + 1),
          role: 'textbox', 'aria-multiline': 'true'
        }
      }
    }
  }));

  protected updateContent(): void {
    const form = this.form();
    if (form.controls.content.disabled) return;
    form.controls.content.markAsDirty();
    form.updateValueAndValidity();
  }

  protected format(command: (typeof this.formatting)[number]['command']): void {
    if (this.form().controls.content.disabled) return;
    const editor = this.editor()?.editor();
    if (editor) this.commands()?.[command](editor);
  }
}
