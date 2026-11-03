import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Check, LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-checkbox',
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Checkbox {
  readonly control = input.required<FormControl<boolean>>();
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly helpText = input('');
  protected readonly CheckIcon = Check;
}
