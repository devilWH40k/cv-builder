import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { LucideAngularModule, Search } from 'lucide-angular';
import { FormField } from '../form-field/form-field';

export interface MultiSelectGroup {
  readonly label: string;
  readonly options: readonly string[];
}

@Component({
  selector: 'app-multi-select',
  imports: [LucideAngularModule],
  templateUrl: './multi-select.html',
  styleUrl: './multi-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiSelect extends FormField<readonly string[]> {
  readonly groups = input.required<readonly MultiSelectGroup[]>();
  protected readonly query = signal('');
  protected readonly SearchIcon = Search;
  protected readonly filteredGroups = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.groups().map((group) => ({
      label: group.label,
      options: group.options.filter((option) => option.toLowerCase().includes(query))
    })).filter((group) => group.options.length > 0);
  });

  protected toggle(option: string): void {
    const control = this.control();
    if (control.disabled) return;
    const selected = control.value;
    control.setValue(selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]);
    control.markAsDirty();
    control.markAsTouched();
  }

  protected close(event: Event, panel: HTMLDetailsElement, trigger: HTMLElement): void {
    event.preventDefault();
    panel.open = false;
    trigger.focus();
  }
}
