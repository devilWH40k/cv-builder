import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-button',
  template: '<button [type]="type()" [disabled]="disabled()"><ng-content /></button>',
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Button {
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
}
