import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Radio } from '../../../shared/ui/radio/radio';
import { CvStructure } from '../../cv/cv-draft';
import { CV_THEMES } from '../../cv/cv-themes';

@Component({
  selector: 'app-structure-options',
  imports: [Radio],
  templateUrl: './structure-options.html',
  styleUrl: './structure-options.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StructureOptions {
  readonly structure = input.required<CvStructure>();
  protected readonly themes = CV_THEMES;
  readonly structureChange = output<CvStructure>();

  protected update(change: Partial<CvStructure>): void {
    this.structureChange.emit({ ...this.structure(), ...change });
  }
}
