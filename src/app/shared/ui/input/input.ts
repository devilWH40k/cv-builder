import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Check, LucideAngularModule, LucideIconData } from 'lucide-angular';
import { FormField } from '../form-field/form-field';

@Component({
  selector: 'app-input',
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './input.html',
  styleUrl: './input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Input extends FormField<string> {
  readonly type = input<'text' | 'email' | 'tel' | 'url' | 'password'>('text');
  readonly autocomplete = input('off');
  readonly helpText = input('');
  readonly suggestions = input<readonly string[]>([]);
  readonly icon = input<LucideIconData>();
  readonly iconSrc = input('');
  protected readonly CheckIcon = Check;
}
