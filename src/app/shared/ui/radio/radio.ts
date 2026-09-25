import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-radio',
  templateUrl: './radio.html',
  styleUrl: './radio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Radio {
  readonly name = input.required<string>();
  readonly value = input.required<string>();
  readonly label = input.required<string>();
  readonly checked = input(false);
  readonly disabled = input(false);
  readonly selected = output<void>();
}
