import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { LucideAngularModule, Search } from 'lucide-angular';
import { FormField } from '../form-field/form-field';
import { CustomEntry, CustomEntryDialog } from '../../../core/dialogs/custom-entry-dialog/custom-entry-dialog';
import { CustomEntryIcons, entryIcon } from '../../../core/dialogs/custom-entry-dialog/custom-entry-icon';

export interface MultiSelectGroup {
  readonly label: string;
  readonly options: readonly string[];
}

@Component({
  selector: 'app-multi-select',
  imports: [LucideAngularModule, CustomEntryDialog],
  templateUrl: './multi-select.html',
  styleUrl: './multi-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiSelect extends FormField<readonly string[]> {
  readonly groups = input.required<readonly MultiSelectGroup[]>();
  readonly optionIcons = input<Readonly<Record<string, string | undefined>>>({});
  readonly allowCustom = input(false);
  readonly showIcons = input(true);
  readonly customIcons = input<CustomEntryIcons>({});
  readonly customIconsChange = output<CustomEntryIcons>();
  readonly savedEntries = input<readonly CustomEntry[]>([]);
  readonly saveEntry = input<((entry: CustomEntry) => Promise<CustomEntry>) | null>(null);
  protected readonly dialogOpen = signal(false);
  protected readonly entryIcon = entryIcon;
  protected readonly icons = computed(() => ({
    ...Object.fromEntries(this.savedEntries().filter((entry) => entry.icon).map((entry) => [entry.name, entry.icon])),
    ...this.customIcons(), ...this.optionIcons()
  }));
  protected readonly availableGroups = computed(() => {
    const groups = this.groups();
    if (!this.allowCustom()) return groups;
    const known = new Set(groups.flatMap((group) => group.options));
    const saved = this.savedEntries().map((entry) => entry.name)
      .filter((name) => !groups.some((group) => group.options.some((option) => option.toLowerCase() === name.toLowerCase())));
    const custom = [...new Set([...saved, ...this.value().filter((option) => !known.has(option))])];
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

  protected addCustom(entry: CustomEntry): void {
    this.dialogOpen.set(false);
    const control = this.control();
    const name = entry.name.trim();
    if (!this.allowCustom() || control.disabled || !name) return;
    const existing = [...this.groups().flatMap((group) => group.options), ...control.value, ...this.savedEntries().map((item) => item.name)]
      .find((option) => option.toLowerCase() === name.toLowerCase());
    const option = existing ?? name;
    const isDefault = this.groups().some((group) => group.options.includes(option));
    if (entry.icon && !isDefault) {
      this.customIconsChange.emit({ ...this.customIcons(), [option]: entry.icon });
      control.markAsDirty();
      control.markAsTouched();
    }
    if (!control.value.includes(option)) {
      control.setValue([...control.value, option]);
      control.markAsDirty();
      control.markAsTouched();
    }
    this.query.set('');
  }

  protected toggle(option: string): void {
    const control = this.control();
    if (control.disabled) return;
    const selected = control.value;
    if (!selected.includes(option)) {
      const icon = entryIcon(this.icons(), option);
      if (icon && !entryIcon(this.customIcons(), option) && !entryIcon(this.optionIcons(), option)) {
        this.customIconsChange.emit({ ...this.customIcons(), [option]: icon });
      }
    }
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
