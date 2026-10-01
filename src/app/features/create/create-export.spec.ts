import { CvPdf } from '../cv/cv-pdf';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Create } from './create';

describe('Export validation navigation', () => {
  let fixture: ComponentFixture<Create>;
  let page: HTMLElement;
  let download: jasmine.Spy;
  let scroll: jasmine.Spy;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Create],
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    });
    download = spyOn(TestBed.inject(CvPdf), 'download').and.resolveTo();
    scroll = spyOn(HTMLElement.prototype, 'scrollIntoView');
    fixture = TestBed.createComponent(Create);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

  async function exportCv(): Promise<void> {
    const button = page.querySelector<HTMLButtonElement>('.actions > app-button button')!;
    expect(button.disabled).toBeFalse();
    button.click();
    await fixture.whenStable();
  }

  function fillGeneralInfo(): void {
    fixture.componentInstance.form.patchValue({
      name: 'Alex', positionTitle: 'Developer', description: 'Summary'
    });
  }

  it('returns from Structure and focuses the first invalid field in form order', async () => {
    page.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    await fixture.whenStable();
    await exportCv();
    expect(page.querySelector<HTMLElement>('#info-panel')!.hidden).toBeFalse();
    expect(document.activeElement).toBe(page.querySelector('#name')!);
    expect(scroll.calls.mostRecent().object).toBe(page.querySelector('#name')!);
    expect(download).not.toHaveBeenCalled();

    fillGeneralInfo();
    await fixture.whenStable();
    await exportCv();
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('reveals a collapsed language error when exporting from preview mode', async () => {
    fillGeneralInfo();
    page.querySelector<HTMLButtonElement>('[aria-label="Add language"] button')!.click();
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('#languages-panel-heading')!.click();
    page.querySelector<HTMLButtonElement>('.mobile-switch')!.click();
    await fixture.whenStable();
    await exportCv();
    expect(page.querySelector('.editor-layout.show-preview')).toBeNull();
    expect(page.querySelector<HTMLElement>('#languages-panel')!.hidden).toBeFalse();
    expect(document.activeElement).toBe(page.querySelector('#language-0')!);
    expect(scroll.calls.mostRecent().object).toBe(page.querySelector('#language-0')!);
    expect(download).not.toHaveBeenCalled();
  });

  it('reveals experience date errors ahead of later language errors', async () => {
    fillGeneralInfo();
    page.querySelector<HTMLButtonElement>('[aria-label="Add experience"] button')!.click();
    page.querySelector<HTMLButtonElement>('[aria-label="Add language"] button')!.click();
    await fixture.whenStable();
    fixture.componentInstance.form.controls.experiences.at(0).patchValue({
      company: 'Example', startDate: '2025-06', endDate: '2024-06'
    });
    page.querySelector<HTMLButtonElement>('#experience-panel-heading')!.click();
    await fixture.whenStable();
    await exportCv();
    const period = page.querySelector<HTMLElement>('.period')!;
    expect(page.querySelector<HTMLElement>('#experience-panel')!.hidden).toBeFalse();
    expect(period.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(period);
    expect(scroll.calls.mostRecent().object).toBe(period);
    expect(download).not.toHaveBeenCalled();
  });
});
