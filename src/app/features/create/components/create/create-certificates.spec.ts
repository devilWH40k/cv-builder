import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CvDraft } from '../../../cv/services/cv-draft';
import { CvPdf } from '../../../cv/services/cv-pdf';
import { createCertificateForm } from '../../helpers/cv-form';
import { Create } from './create';

describe('CV certificates', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [Create],
    providers: [provideZonelessChangeDetection(), provideRouter([])]
  }));

  it('requires a name, allows no link, and rejects invalid or unsafe links', () => {
    const form = createCertificateForm();
    expect(form.valid).toBeFalse();
    form.controls.name.setValue('   ');
    expect(form.valid).toBeFalse();
    form.controls.name.setValue('Angular Certification');
    expect(form.valid).toBeTrue();
    for (const link of ['https://example.com/certificate', '  ']) {
      form.controls.link.setValue(link);
      expect(form.valid).withContext(link).toBeTrue();
    }
    for (const link of ['http://example.com/certificate', 'HTTP://example.com/certificate', 'invalid', 'javascript:alert(1)', 'data:text/html,hello', 'https://user:pass@example.com']) {
      form.controls.link.setValue(link);
      expect(form.valid).withContext(link).toBeFalse();
    }
  });

  it('adds, previews, restores, edits, and removes certificates', async () => {
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('[aria-label="Add certificate"] button')!.click();
    const certificate = { name: 'Angular Certification', link: 'https://example.com/certificate', date: '2025-06-15' };
    fixture.componentInstance.form.controls.certificates.at(0).setValue(certificate);
    await fixture.whenStable();
    expect(TestBed.inject(CvDraft).current()?.certificates).toEqual([certificate]);
    const link = page.querySelector<HTMLAnchorElement>('.cv-certificates a')!;
    expect(link.textContent).toBe('link');
    expect(link.href).toBe(certificate.link);
    expect(link.rel).toContain('noopener');
    expect(page.querySelector('.cv-certificates .period')?.textContent).toContain('June');
    expect(page.querySelector('.cv-certificates .period')?.textContent).toContain('2025');
    document.body.appendChild(page);
    page.querySelector<HTMLButtonElement>('.mobile-switch')!.click();
    await fixture.whenStable();
    const dateBounds = page.querySelector('.cv-certificates .period')!.getBoundingClientRect();
    const linkBounds = link.getBoundingClientRect();
    expect(linkBounds.left).toBeGreaterThan(dateBounds.right);
    expect(linkBounds.left - dateBounds.right).toBeLessThanOrEqual(12);
    expect(getComputedStyle(link).color).toBe('rgb(54, 212, 247)');
    expect(Math.abs(linkBounds.top - dateBounds.top)).toBeLessThan(10);
    fixture.componentInstance.form.controls.certificates.at(0).controls.date.setValue('');
    await fixture.whenStable();
    expect(page.querySelector('.cv-certificates .period')).toBeNull();
    expect(link.getBoundingClientRect().left).toBeCloseTo(
      page.querySelector('.certificate-entry h4')!.getBoundingClientRect().left, 0);
    fixture.componentInstance.form.controls.certificates.at(0).controls.date.setValue(certificate.date);
    await fixture.whenStable();
    fixture.destroy();
    page.remove();

    const restored = TestBed.createComponent(Create);
    await restored.whenStable();
    expect(restored.componentInstance.form.controls.certificates.getRawValue()).toEqual([certificate]);
    const restoredPage: HTMLElement = restored.nativeElement;
    restored.componentInstance.form.controls.certificates.at(0).controls.link.setValue('http://example.com/certificate');
    await restored.whenStable();
    expect(restoredPage.querySelector('.cv-certificates a')).toBeNull();
    expect(restored.componentInstance.form.controls.certificates.at(0).controls.link.invalid).toBeTrue();
    restored.componentInstance.form.controls.certificates.at(0).controls.link.setValue('javascript:alert(1)');
    await restored.whenStable();
    expect(restoredPage.querySelector('.cv-certificates a')).toBeNull();
    restored.componentInstance.form.controls.certificates.at(0).controls.link.setValue('');
    await restored.whenStable();
    expect(restoredPage.querySelector('.cv-certificates')?.textContent).toContain(certificate.name);
    expect(restoredPage.querySelector('.cv-certificates a')).toBeNull();
    restoredPage.querySelector<HTMLButtonElement>('[aria-label="Remove certificate 1"]')!.click();
    await restored.whenStable();
    expect(TestBed.inject(CvDraft).current()?.certificates).toEqual([]);
    expect(restoredPage.querySelector('.cv-certificates')).toBeNull();
  });

  it('supports older certificates without dates and validates optional dates', () => {
    const form = createCertificateForm({ name: 'Certificate', link: '' });
    expect(form.controls.date.value).toBe('');
    expect(form.valid).toBeTrue();
    for (const date of ['2025', '2025-06', '2025-06-15', '']) {
      form.controls.date.setValue(date);
      expect(form.valid).withContext(date).toBeTrue();
    }
    for (const date of ['2025-02-30', 'invalid']) {
      form.controls.date.setValue(date);
      expect(form.valid).withContext(date).toBeFalse();
    }
  });

  it('opens the panel and prevents export until a certificate is valid', async () => {
    const download = spyOn(TestBed.inject(CvPdf), 'download').and.resolveTo();
    spyOn(HTMLElement.prototype, 'scrollIntoView');
    const fixture = TestBed.createComponent(Create);
    const page: HTMLElement = fixture.nativeElement;
    fixture.componentInstance.form.patchValue({ name: 'Alex', positionTitle: 'Engineer', description: 'Summary' });
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('[aria-label="Add certificate"] button')!.click();
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('#certificates-panel-heading')!.click();
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('.actions > ui-button button')!.click();
    await fixture.whenStable();
    expect(page.querySelector<HTMLElement>('#certificates-panel')!.hidden).toBeFalse();
    expect(download).not.toHaveBeenCalled();
    fixture.componentInstance.form.controls.certificates.at(0).controls.name.setValue('Certificate');
    page.querySelector<HTMLButtonElement>('.actions > ui-button button')!.click();
    await fixture.whenStable();
    expect(download).toHaveBeenCalledWith(jasmine.objectContaining({ certificates: [{ name: 'Certificate', link: '', date: '' }] }));
  });
});
