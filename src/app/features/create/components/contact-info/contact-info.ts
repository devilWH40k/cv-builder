import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LucideAngularModule, Mail, Phone, Copy, X, ChevronDown } from 'lucide-angular';
import { Tooltip } from '../../../../shared/directories/tooltip';
import { Input } from '../../../../shared/ui/input/input';
import { Button } from '../../../../shared/ui/button/button';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ContactForm, createSocialForm } from '../../helpers/cv-form';
import { SOCIAL_NETWORKS, socialLink, SocialNetwork } from '../../../cv/helpers/cv-contact';

@Component({
  selector: 'app-contact-info',
  imports: [Input, Button, LucideAngularModule, Tooltip],
  templateUrl: './contact-info.html',
  styleUrl: './contact-info.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactInfo {
  readonly form = input.required<ContactForm>();
  protected readonly networks = SOCIAL_NETWORKS;
  protected readonly socialLink = socialLink;
  protected readonly PhoneIcon = Phone;
  protected readonly MailIcon = Mail;
  protected readonly CopyIcon = Copy;
  protected readonly XIcon = X;
  protected readonly ChevronDownIcon = ChevronDown;
  private readonly toasts = inject(ToastService);

  protected network(name: string) {
    return SOCIAL_NETWORKS.find((network) => network.name === name);
  }

  protected selectNetwork(index: number, network: SocialNetwork, picker: HTMLDetailsElement): void {
    const row = this.form().controls.socials.at(index);
    row.controls.network.setValue(network);
    row.controls.network.markAsDirty();
    row.controls.value.updateValueAndValidity();
    this.normalize(index);
    picker.open = false;
    picker.querySelector('summary')?.focus();
  }

  protected add(): void {
    this.form().controls.socials.push(createSocialForm());
    this.form().markAsDirty();
  }

  protected normalize(index: number): void {
    const row = this.form().controls.socials.at(index);
    const link = socialLink(row.getRawValue());
    if (link && link.text !== row.controls.value.value) {
      row.controls.value.setValue(link.text);
      row.controls.value.markAsDirty();
    }
  }

  protected paste(event: ClipboardEvent, index: number): void {
    const value = event.clipboardData?.getData('text');
    if (!value) return;
    const row = this.form().controls.socials.at(index);
    const link = socialLink({ network: row.controls.network.value, value });
    if (!link) return;
    event.preventDefault();
    row.controls.value.setValue(link.text);
    row.controls.value.markAsDirty();
  }

  protected remove(index: number): void {
    this.form().controls.socials.removeAt(index);
    this.form().markAsDirty();
  }

  protected async copy(href: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(href);
      this.toasts.show('success', 'Contact link copied.');
    } catch {
      this.toasts.show('danger', 'The link could not be copied. Select and copy the text instead.');
    }
  }
}
