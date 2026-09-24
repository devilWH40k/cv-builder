import { ChangeDetectionStrategy, Component } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Footer {
  protected readonly currentYear = new Date().getFullYear();
  protected readonly appVersion = environment.appVersion;
}
