import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ChevronDown, LucideAngularModule } from 'lucide-angular';
import { FormField } from '../form-field/form-field';

@Component({
  selector: 'app-select',
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Select extends FormField<string> {
  readonly options = input.required<readonly string[]>();
  protected readonly ChevronDownIcon = ChevronDown;
}
