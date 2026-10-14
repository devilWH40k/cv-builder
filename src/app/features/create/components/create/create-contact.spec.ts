import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Create } from './create';
import { CvDraft } from '../../../cv/services/cv-draft';
import { CvPdf } from '../../../cv/services/cv-pdf';
import { SavedCvs } from '../../../cv/services/saved-cvs';

describe('Contact information editor', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [Create], providers: [provideZonelessChangeDetection(), provideRouter([])],
  }));

  it('extracts a pasted nickname, saves it and copies the full link beside delete', async () => {
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('[aria-label="Add social network"] button')!.click();
    await fixture.whenStable();
    page.querySelectorAll<HTMLButtonElement>('.network-options button')[1].click();
    await fixture.whenStable();
    const input = page.querySelector<HTMLInputElement>('#social-value-0')!;
    const clipboardData = new DataTransfer();
    clipboardData.setData('text', 'https://t.me/alex_dev?source=cv');
    const event = new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    await fixture.whenStable();
    expect(event.defaultPrevented).toBeTrue();
    expect(input.value).toBe('@alex_dev');
    expect(TestBed.inject(CvDraft).current()?.contact?.socials[0].value).toBe('@alex_dev');
    expect(page.querySelector('.cv-contacts a[href="https://t.me/alex_dev"]')?.textContent?.trim()).toBe('@alex_dev');
    expect(page.querySelector('.link-actions')).toBeNull();
    const buttons = page.querySelectorAll<HTMLButtonElement>('.social-actions button');
    expect(buttons[0].getAttribute('aria-label')).toBe('Copy Telegram link');
    expect(buttons[1].getAttribute('aria-label')).toBe('Remove social network 1');
    buttons[0].dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Copy social link');
    const copy = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    buttons[0].click();
    await fixture.whenStable();
    expect(copy).toHaveBeenCalledWith('https://t.me/alex_dev');
  });

  it('keeps hinted fields stable through validation and separates icons and the add button', async () => {
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    const phone = page.querySelector<HTMLInputElement>('#contact-phone')!;
    const field = phone.closest<HTMLElement>('.field')!;
    const email = page.querySelector<HTMLInputElement>('#contact-email')!;
    const height = field.getBoundingClientRect().height;
    const emailOffset = () => email.getBoundingClientRect().top - field.getBoundingClientRect().top;
    const emailTop = emailOffset();
    const icon = field.querySelector<HTMLElement>('.leading-icon')!.getBoundingClientRect();
    const input = phone.getBoundingClientRect();
    expect(Math.abs((icon.top + icon.height / 2) - (input.top + input.height / 2))).toBeLessThan(1);
    expect(input.left + parseFloat(getComputedStyle(phone).paddingLeft) - icon.right).toBeGreaterThanOrEqual(12);
    const button = page.querySelector<HTMLElement>('.add-social')!.getBoundingClientRect();
    const empty = page.querySelector<HTMLElement>('app-contact-info .empty-state')!.getBoundingClientRect();
    expect(button.top - empty.bottom).toBeGreaterThanOrEqual(16);
    const label = field.querySelector<HTMLElement>('label')!;
    const standardLabel = page.querySelector<HTMLElement>('label[for="name"]')!;
    phone.focus({ preventScroll: true });
    expect(getComputedStyle(label).left).toBe(getComputedStyle(standardLabel).left);
    phone.value = '324';
    phone.dispatchEvent(new Event('input'));
    phone.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(page.querySelector('#contact-phone-error')?.textContent).toContain('Enter a valid phone number');
    expect(field.getBoundingClientRect().height).toBe(height);
    expect(emailOffset()).toBe(emailTop);
    phone.value = '+380501234567';
    phone.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(field.getBoundingClientRect().height).toBe(height);
    expect(emailOffset()).toBe(emailTop);
    expect(getComputedStyle(label).left).toBe(getComputedStyle(standardLabel).left);
    await Promise.all(label.getAnimations().map((animation) => animation.finished));
    expect(getComputedStyle(label).color).toBe(getComputedStyle(field.querySelector('.success-icon')!).color);
  });

  it('adds icon-selected profiles, updates the draft and preview, copies links and removes rows', async () => {
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('[aria-label="Add social network"] button')!.click();
    await fixture.whenStable();
    const options = page.querySelectorAll<HTMLButtonElement>('.network-options button');
    expect(options.length).toBe(5);
    expect(options[0].querySelector('img')?.getAttribute('src')).toBe('/socials/linkedin.svg');
    options[1].click();
    await fixture.whenStable();
    const input = page.querySelector<HTMLInputElement>('#social-value-0')!;
    input.value = '@alex_dev';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.componentInstance.form.controls.contact.patchValue({ phone: '+380501234567', email: 'alex@example.com' });
    await fixture.whenStable();
    expect(TestBed.inject(CvDraft).current()?.contact?.socials).toEqual([{ network: 'Telegram', value: '@alex_dev' }]);
    expect(page.querySelector('.cv-contacts a[href="https://t.me/alex_dev"]')?.textContent).toContain('@alex_dev');
    expect(page.querySelector('.cv-contacts a[href="mailto:alex@example.com"]')).not.toBeNull();
    const contacts = page.querySelector<HTMLElement>('.cv-sidebar .cv-contacts')!;
    expect(contacts.textContent).not.toContain('Phone:');
    expect(contacts.textContent).not.toContain('Telegram:');
    expect(getComputedStyle(contacts.querySelector('a')!).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    const summary = page.querySelector<HTMLElement>('app-contact-info summary')!;
    expect(getComputedStyle(summary).display).toBe('flex');
    const selectedIcon = summary.querySelector('img')!.getBoundingClientRect();
    const selectedName = summary.querySelector('span')!.getBoundingClientRect();
    expect(selectedIcon.right).toBeLessThan(selectedName.left);
    expect(Math.abs(selectedIcon.top + selectedIcon.height / 2 - selectedName.top - selectedName.height / 2)).toBeLessThan(1);
    expect(page.querySelector('#contact-phone')?.parentElement?.querySelector('.leading-icon')).not.toBeNull();
    const copy = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    page.querySelector<HTMLButtonElement>('[aria-label="Copy Telegram link"]')!.click();
    await fixture.whenStable();
    expect(copy).toHaveBeenCalledWith('https://t.me/alex_dev');
    page.querySelector<HTMLButtonElement>('[aria-label="Remove social network 1"]')!.click();
    await fixture.whenStable();
    expect(TestBed.inject(CvDraft).current()?.contact?.socials).toEqual([]);
    expect(page.querySelector('.cv-contacts a[href="https://t.me/alex_dev"]')).toBeNull();
  });

  it('restores contacts when reopening a saved CV', async () => {
    const contact = { phone: '+380501234567', email: 'alex@example.com', socials: [{ network: 'X', value: '@alex' }] };
    spyOn(TestBed.inject(ActivatedRoute).snapshot.queryParamMap, 'get').and.returnValue('saved-contact');
    spyOn(TestBed.inject(SavedCvs), 'load').and.resolveTo({
      name: 'Alex', positionTitle: 'Developer', description: 'Summary', photo: null,
      languages: [], technologies: [], experiences: [], contact,
    });
    const fixture = TestBed.createComponent(Create);
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.contact.getRawValue()).toEqual(contact);
    expect((fixture.nativeElement as HTMLElement).querySelector('.cv-contacts a[href="https://x.com/alex"]')).not.toBeNull();
  });

  it('blocks export and focuses invalid contact fields, then revalidates a changed network', async () => {
    const download = spyOn(TestBed.inject(CvPdf), 'download').and.resolveTo();
    spyOn(HTMLElement.prototype, 'scrollIntoView');
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    fixture.componentInstance.form.patchValue({ name: 'Alex', positionTitle: 'Developer', description: 'Summary', contact: { email: 'invalid' } });
    page.querySelector<HTMLButtonElement>('.actions > app-button button')!.click();
    await fixture.whenStable();
    expect(download).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(page.querySelector('#contact-email'));
    fixture.componentInstance.form.controls.contact.controls.email.setValue('alex@example.com');
    page.querySelector<HTMLButtonElement>('[aria-label="Add social network"] button')!.click();
    await fixture.whenStable();
    page.querySelectorAll<HTMLButtonElement>('.network-options button')[4].click();
    await fixture.whenStable();
    const input = page.querySelector<HTMLInputElement>('#social-value-0')!;
    input.value = '@abc';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    page.querySelectorAll<HTMLButtonElement>('.network-options button')[1].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.contact.controls.socials.at(0).controls.value.invalid).toBeTrue();
  });
});
