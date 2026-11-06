import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Input } from 'angular-shared-ui/input';
import { DatePicker } from 'angular-shared-ui/date-picker';
import { LucideAngularModule, X } from 'lucide-angular';
import { createCertificateForm } from '../../helpers/cv-form';

@Component({
  selector: 'app-certificate-entry',
  imports: [Input, DatePicker, LucideAngularModule],
  templateUrl: './certificate-entry.html',
  styleUrl: './certificate-entry.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CertificateEntry {
  readonly form = input.required<ReturnType<typeof createCertificateForm>>();
  readonly index = input.required<number>();
  readonly remove = output<void>();
  protected readonly XIcon = X;
}
