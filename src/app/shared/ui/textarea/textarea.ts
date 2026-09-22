import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Check, LucideAngularModule } from 'lucide-angular';
import { FormField } from '../form-field/form-field';

@Component({
  selector: 'app-textarea',
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './textarea.html',
  styleUrl: './textarea.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Textarea extends FormField<string> {
  readonly rows = input(3);
  protected readonly CheckIcon = Check;
}
