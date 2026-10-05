import { SavedCvs } from '../../cv/saved-cvs';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { AngularTiptapEditorComponent, AteEditorCommandsService, AteEditorConfig } from '@flogeez/angular-tiptap-editor';
import { Bold, Italic, List, ListOrdered, LucideAngularModule, Redo2, Save, Underline, Undo2, X } from 'lucide-angular';
import { Input } from '../../../shared/ui/input/input';
import { MultiSelect } from '../../../shared/ui/multi-select/multi-select';
import { DatePicker } from '../../../shared/ui/date-picker/date-picker';
import { DateMode, parseCalendarDate } from '../../../shared/ui/date-picker/date-value';
import { USED_TECHNOLOGY_GROUPS, USED_TECHNOLOGY_ICONS } from '../../cv/used-technologies';
import { createExperienceForm } from '../cv-form';

@Component({
  selector: 'app-experience-entry',
  imports: [ReactiveFormsModule, Input, MultiSelect, DatePicker, AngularTiptapEditorComponent, LucideAngularModule],
  templateUrl: './experience-entry.html',
  styleUrl: './experience-entry.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExperienceEntry {
  readonly form = input.required<ReturnType<typeof createExperienceForm>>();
  readonly index = input.required<number>();
  readonly remove = output<void>();
  private readonly editor = viewChild(AngularTiptapEditorComponent);
  private readonly commands = viewChild(AngularTiptapEditorComponent, { read: AteEditorCommandsService });
  protected readonly formatting = [
    { label: 'Bold', icon: Bold, command: 'toggleBold' },
    { label: 'Italic', icon: Italic, command: 'toggleItalic' },
    { label: 'Underline', icon: Underline, command: 'toggleUnderline' },
    { label: 'Bullet list', icon: List, command: 'toggleBulletList' },
    { label: 'Numbered list', icon: ListOrdered, command: 'toggleOrderedList' },
    { label: 'Undo', icon: Undo2, command: 'undo' },
    { label: 'Redo', icon: Redo2, command: 'redo' }
  ] as const;
  protected readonly XIcon = X;
  protected readonly SaveIcon = Save;
  protected readonly saving = signal(false);
  private readonly saved = inject(SavedCvs);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected async save(): Promise<void> {
    if (this.saving()) return;
    const form = this.form();
    form.markAllAsTouched();
    if (form.invalid) {
      this.toasts.show('alert', 'Please correct the experience fields before saving.');
      return;
    }
    this.saving.set(true);
    try {
      const id = await this.saved.saveExperience(form.getRawValue());
      if (this.destroyRef.destroyed) return;
      form.controls.savedExperienceId.setValue(id);
      form.markAsDirty();
      this.toasts.show('success', 'Your experience has been saved.');
    } catch {
      if (!this.destroyRef.destroyed) this.toasts.show('danger', 'Your experience could not be saved. Please try again.');
    } finally {
      if (!this.destroyRef.destroyed) this.saving.set(false);
    }
  }

  protected readonly technologyGroups = USED_TECHNOLOGY_GROUPS;
  protected readonly technologyIcons = USED_TECHNOLOGY_ICONS;
  protected readonly dateMode = signal<DateMode>('month-year');
  protected readonly parseDate = parseCalendarDate;
  protected readonly editorConfig = computed<AteEditorConfig>(() => ({
    locale: 'en', theme: 'light', minHeight: 200, autofocus: false,
    placeholder: 'Describe the project, your responsibilities, and achievements...',
    showToolbar: false, showEditToggle: false, showFooter: false, enableSlashCommands: false,
    showBubbleMenu: false, blockControls: 'none',
    tiptapOptions: {
      editorProps: {
        attributes: {
          'aria-label': 'Project description for experience ' + (this.index() + 1),
          role: 'textbox', 'aria-multiline': 'true'
        }
      }
    }
  }));

  protected updateDescription(): void {
    const form = this.form();
    if (form.controls.description.disabled) return;

    form.controls.description.markAsDirty();
    form.updateValueAndValidity();
  }

  protected format(command: (typeof this.formatting)[number]['command']): void {
    if (this.form().controls.description.disabled) return;
    const editor = this.editor()?.editor();
    if (editor) this.commands()?.[command](editor);
  }

  protected changeMode(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'year' || value === 'month-year' || value === 'day-month-year') {
      this.dateMode.set(value);
    }
  }

  protected removeTechnology(technology: string): void {
    const control = this.form().controls.technologies;
    control.setValue(control.value.filter((item) => item !== technology));
    control.markAsDirty();
    control.markAsTouched();
  }
}
