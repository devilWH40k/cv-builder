import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { LucideAngularModule, Search } from 'lucide-angular';
import { FormField } from '../form-field/form-field';
import { Button } from '../button/button';

export interface MultiSelectGroup {
  readonly label: string;
  readonly options: readonly string[];
}

@Component({
  selector: 'app-multi-select',
  imports: [LucideAngularModule, Button],
  templateUrl: './multi-select.html',
  styleUrl: './multi-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiSelect extends FormField<readonly string[]> {
  readonly groups = input.required<readonly MultiSelectGroup[]>();
  readonly optionIcons = input<Readonly<Record<string, string | undefined>>>({});
  readonly allowCustom = input(false);
  protected readonly customName = signal('');
  protected readonly availableGroups = computed(() => {
    const groups = this.groups();
    if (!this.allowCustom()) return groups;
    const known = new Set(groups.flatMap((group) => group.options));
    const custom = this.value().filter((option) => !known.has(option));
    return custom.length ? [...groups, { label: 'Custom', options: custom }] : groups;
  });
  protected readonly query = signal('');
  protected readonly SearchIcon = Search;
  protected readonly filteredGroups = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.availableGroups().map((group) => ({
      label: group.label,
      options: group.options.filter((option) => option.toLowerCase().includes(query))
    })).filter((group) => group.options.length > 0);
  });

  protected addCustom(event?: Event): void {
    event?.preventDefault();
    const control = this.control();
    const name = this.customName().trim();
    if (!this.allowCustom() || control.disabled || !name) return;
    const existing = [...this.groups().flatMap((group) => group.options), ...control.value]
      .find((option) => option.toLowerCase() === name.toLowerCase());
    const option = existing ?? name;
    if (!control.value.includes(option)) {
      control.setValue([...control.value, option]);
      control.markAsDirty();
      control.markAsTouched();
    }
    this.customName.set('');
    this.query.set('');
  }

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
