import { AbstractControl, FormControl, ValidationErrors, Validators } from '@angular/forms';

export const SOCIAL_NETWORKS = [
  { name: 'LinkedIn', icon: '/socials/linkedin.svg', hint: 'Profile nickname or linkedin.com/in/your-name' },
  { name: 'Telegram', icon: '/socials/telegram.svg', hint: '@username or t.me/username' },
  { name: 'Viber', icon: '/socials/viber.svg', hint: 'International phone number or viber://chat link' },
  { name: 'WhatsApp', icon: '/socials/whatsapp-icon.svg', hint: 'International phone number or wa.me link' },
  { name: 'X', icon: '/socials/x.svg', hint: '@username or x.com/username' },
] as const;

export type SocialNetwork = typeof SOCIAL_NETWORKS[number]['name'];
export interface CvSocialLink { readonly network: string; readonly value: string; }
export interface CvContactInfo {
  readonly phone: string;
  readonly email: string;
  readonly socials: readonly CvSocialLink[];
}
export interface ContactLink {
  readonly label: string;
  readonly text: string;
  readonly href: string;
  readonly icon?: string;
}

export const PHONE_PATTERN = /^\+?[0-9 ()-]+$/;
export function phoneNumber(value: string): string | null {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  const balanced = !/[()]/.test(trimmed.replace(/\([0-9]+\)/g, ''));
  return trimmed.length <= 64 && digits.length >= 7 && digits.length <= 15 && PHONE_PATTERN.test(trimmed) && balanced
    ? (trimmed.startsWith('+') ? '+' : '') + digits : null;
}

export function phoneValidator(control: AbstractControl): ValidationErrors | null {
  return !control.value || (typeof control.value === 'string' && phoneNumber(control.value)) ? null : { phone: true };
}

export function emailValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  return Validators.email(control) || (typeof control.value !== 'string' ||
    !/^[^\s@]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(control.value)
    ? { email: true } : null);
}

export function socialLink(entry: CvSocialLink): ContactLink | null {
  const network = SOCIAL_NETWORKS.find((network) => network.name === entry.network);
  const value = entry.value.trim();
  if (!network || !value || (/[\s\u0000-\u001f]/.test(value) && !['Viber', 'WhatsApp'].includes(network.name))) return null;
  let href: string | null = null;
  let text = value;
  const internationalPhone = (text: string) => {
    const number = phoneNumber(text);
    return number?.startsWith('+') ? number : null;
  };
  if (network.name === 'Viber') {
    let number = internationalPhone(value);
    if (!number && value.startsWith('viber://chat?')) {
      try {
        const url = new URL(value);
        if (url.hostname === 'chat' && !url.username && !url.password && !url.port && !url.pathname) {
          number = internationalPhone(url.searchParams.get('number') ?? '');
        }
      } catch { return null; }
    }
    if (number) {
      href = `viber://chat?number=${encodeURIComponent(number)}`;
      text = number;
    }
  } else if (network.name === 'WhatsApp' && internationalPhone(value)) {
    href = `https://wa.me/${phoneNumber(value)?.replace(/^\+/, '')}`;
  } else {
    const domains: Partial<Record<SocialNetwork, readonly string[]>> = {
      LinkedIn: ['linkedin.com', 'www.linkedin.com'], Telegram: ['t.me'],
      WhatsApp: ['wa.me'], X: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
    };
    const hosts = domains[network.name] ?? [];
    const isUrl = /^https?:\/\//i.test(value) || hosts.some((host) => value.toLowerCase().startsWith(host + '/'));
    if (isUrl) {
      try {
        const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
        const path = url.pathname;
        const validPath = network.name === 'LinkedIn' ? /^\/in\/[a-z0-9_%~-]+\/?$/i.test(path)
          : network.name === 'Telegram' ? /^\/[a-z][a-z0-9_]{4,31}\/?$/i.test(path)
            : network.name === 'WhatsApp' ? /^\/[0-9]{7,15}\/?$/.test(path)
              : /^\/[a-z0-9_]{1,15}\/?$/i.test(path);
        if (hosts.includes(url.hostname) && !url.username && !url.password && !url.port && validPath) {
          url.protocol = 'https:';
          url.search = '';
          url.hash = '';
          href = url.href;
          const nickname = path.replace(/\/$/, '').split('/').at(-1)!;
          text = network.name === 'WhatsApp' ? `+${nickname}`
            : network.name === 'LinkedIn' ? nickname : `@${nickname}`;
        }
      } catch { return null; }
    } else {
      const nickname = value.replace(/^@/, '');
      if (network.name === 'LinkedIn' && /^[a-z0-9_%~-]+$/i.test(nickname)) href = `https://www.linkedin.com/in/${nickname}`;
      if (network.name === 'Telegram' && /^[a-z][a-z0-9_]{4,31}$/i.test(nickname)) href = `https://t.me/${nickname}`;
      if (network.name === 'X' && /^[a-z0-9_]{1,15}$/i.test(nickname)) href = `https://x.com/${nickname}`;
    }
  }
  return href ? { label: network.name, text, href, icon: network.icon } : null;
}

export function contactLinks(contact?: CvContactInfo): readonly ContactLink[] {
  if (!contact) return [];

  const links: ContactLink[] = [];
  const phone = phoneNumber(contact.phone);

  if (phone) links.push({ label: 'Phone', text: contact.phone, href: `tel:${phone}` });

  if (contact.email && !emailValidator(new FormControl(contact.email))) {
    links.push({ label: 'Email', text: contact.email, href: `mailto:${contact.email}` });
  }

  for (const entry of contact.socials) {
    const link = socialLink(entry);
    if (link) links.push(link);
  }

  return links;
}
