import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ChevronDown, LucideAngularModule } from 'lucide-angular';
import { FormField } from '../form-field/form-field';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'app-select',
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Select extends FormField<string> {
  readonly options = input.required<readonly (string | SelectOption)[]>();
  protected readonly choices = computed(() => this.options().map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option));
  protected readonly hasEmptyOption = computed(() => this.choices().some((option) => option.value === ''));
  protected readonly ChevronDownIcon = ChevronDown;
}
