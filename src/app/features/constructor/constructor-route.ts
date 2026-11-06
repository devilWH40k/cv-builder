import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { CONSTRUCTOR_SOURCE, CONSTRUCTOR_VERSION } from 'constructor/core';
import { ConstructorPageComponent } from 'constructor/editor';
import { CvDraft } from '../cv/services/cv-draft';
import { Preview } from '../preview/components/preview/preview';
import { environment } from '../../../environments/environment';
import { ConstructorCvSource } from './constructor-cv-source';

@Component({
  selector: 'app-constructor-route',
  imports: [ConstructorPageComponent, Preview],
  providers: [
    CvDraft,
    ConstructorCvSource,
    { provide: CONSTRUCTOR_SOURCE, useExisting: ConstructorCvSource },
    { provide: CONSTRUCTOR_VERSION, useValue: environment.appVersion },
  ],
  template: `
    <lib-constructor-page>
      <app-preview constructorPreview [embedded]="true" [readOnly]="true"
        style="--preview-max-height: none; --preview-max-scale: 1" />
    </lib-constructor-page>
  `,
  styles: ':host { display: grid; min-width: 0; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructorRoute {
  private readonly page = viewChild.required(ConstructorPageComponent);

  canDeactivate(): boolean | Promise<boolean> {
    return this.page().canDeactivate();
  }
}
