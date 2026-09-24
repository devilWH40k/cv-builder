import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LucideAngularModule, LoaderCircle, Save } from 'lucide-angular';
import { Button } from '../../shared/ui/button/button';
import { CvInfo } from './cv-draft';
import { SaveCv } from './save-cv';

@Component({
  selector: 'app-save-cv-button',
  imports: [Button, LucideAngularModule],
  template: `
    <app-button [attr.aria-busy]="saveCv.saving()" [disabled]="saveCv.saving()" (click)="saveCv.save(info()())">
      <lucide-icon [img]="saveCv.saving() ? SpinnerIcon : SaveIcon" [class.spinning]="saveCv.saving()" [size]="20" aria-hidden="true" />
      Save
    </app-button>
  `,
  styles: `
    :host { display: block; }
    lucide-icon { display: flex; }
    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      .spinning { animation: none; }
    }
    app-button { display: block; width: var(--button-width, auto); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SaveCvButton {
  readonly info = input.required<() => CvInfo | null>();
  protected readonly saveCv = inject(SaveCv);
  protected readonly SaveIcon = Save;
  protected readonly SpinnerIcon = LoaderCircle;
}

