import { FormControl } from '@angular/forms';
import { contactLinks, emailValidator, phoneValidator, socialLink } from './cv-contact';

describe('CV contact validation and links', () => {
  it('extracts display names from profile URLs and phone numbers from messaging links', () => {
    for (const [network, value, text] of [
      ['LinkedIn', 'https://www.linkedin.com/in/alex-morgan/?trk=profile', 'alex-morgan'],
      ['Telegram', 'https://t.me/alex_dev', '@alex_dev'],
      ['X', 'https://x.com/alex_dev', '@alex_dev'],
      ['WhatsApp', 'https://wa.me/380501234567', '+380501234567'],
      ['Viber', 'viber://chat?number=%2B380501234567', '+380501234567'],
    ]) expect(socialLink({ network, value })?.text).toBe(text);
  });
  it('allows optional contact fields and common international phone formatting', () => {
    for (const value of ['', '+380 (50) 123-45-67', '0501234567', '(555) 123-4567']) {
      expect(phoneValidator(new FormControl(value))).toBeNull();
    }
    for (const value of ['123', '+1234567890123456', '1234567<script>', '++380501234567', '(555 123-4567']) {
      expect(phoneValidator(new FormControl(value))).not.toBeNull();
    }
  });

  it('accepts plus addressing and subdomains and rejects malformed emails', () => {
    for (const value of ['', 'first.last+cv@example.co.uk', 'name@example.technology']) {
      expect(emailValidator(new FormControl(value))).toBeNull();
    }
    for (const value of ['name', 'name@localhost', 'a..b@example.com', 'name@-example.com', 'name@example.com\n', 'a'.repeat(65) + '@example.com']) {
      expect(emailValidator(new FormControl(value))).not.toBeNull();
    }
  });

  it('resolves nicknames, profile URLs and messaging phone numbers', () => {
    const cases = [
      ['LinkedIn', 'alex-morgan', 'https://www.linkedin.com/in/alex-morgan'],
      ['LinkedIn', 'linkedin.com/in/alex-morgan/?trk=profile', 'https://linkedin.com/in/alex-morgan/'],
      ['Telegram', '@alex_dev', 'https://t.me/alex_dev'],
      ['Telegram', 't.me/alex_dev', 'https://t.me/alex_dev'],
      ['X', '@alex_dev', 'https://x.com/alex_dev'],
      ['X', 'http://twitter.com/alex_dev', 'https://twitter.com/alex_dev'],
      ['WhatsApp', '+380 50 123 4567', 'https://wa.me/380501234567'],
      ['WhatsApp', 'wa.me/380501234567', 'https://wa.me/380501234567'],
      ['Viber', '+380501234567', 'viber://chat?number=%2B380501234567'],
      ['Viber', 'viber://chat?number=%2B380501234567', 'viber://chat?number=%2B380501234567'],
    ];
    for (const [network, value, href] of cases) expect(socialLink({ network, value })?.href).toBe(href);
  });

  it('rejects unsafe schemes, unrelated hosts, credentials and non-profile paths', () => {
    for (const value of ['javascript:alert(1)', 'https://evil.com/alex', 'https://x.com.evil.com/alex',
      'https://user:pass@x.com/alex', 'https://x.com:444/alex', 'https://x.com/alex/status/123', 'https://x.com/']) {
      expect(socialLink({ network: 'X', value })).toBeNull();
    }
    expect(socialLink({ network: 'Telegram', value: '@a' })).toBeNull();
    expect(socialLink({ network: 'WhatsApp', value: '0501234567' })).toBeNull();
    expect(socialLink({ network: 'Unknown', value: 'alex' })).toBeNull();
  });

  it('keeps valid contacts as readable links while excluding invalid draft values', () => {
    expect(contactLinks()).toEqual([]);
    const links = contactLinks({ phone: '+380 50 123 4567', email: 'name@example.com',
      socials: [{ network: 'X', value: '@alex' }, { network: 'X', value: 'javascript:alert(1)' }] });
    expect(links.map((link) => link.href)).toEqual(['tel:+380501234567', 'mailto:name@example.com', 'https://x.com/alex']);
    expect(links[0].text).toBe('+380 50 123 4567');
  });
});
