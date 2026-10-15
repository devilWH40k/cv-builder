import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Guides } from './guides';

describe('Guides', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter([{ path: 'guides', component: Guides }])]
  }));

  for (const guide of ['import-export-guide', 'manage-folders-guide', 'manage-experiences-guide']) {
    it(`opens, focuses and scrolls to ${guide} on direct navigation`, async () => {
      const scroll = spyOn(HTMLElement.prototype, 'scrollIntoView');
      const harness = await RouterTestingHarness.create(`/guides?guide=${guide}`);
      await harness.fixture.whenStable();
      const heading = harness.routeNativeElement!.querySelector<HTMLButtonElement>(`#${guide}-heading`)!;
      expect(heading.getAttribute('aria-expanded')).toBe('true');
      expect(harness.routeNativeElement!.querySelector<HTMLElement>(`#${guide}`)!.hidden).toBeFalse();
      expect(document.activeElement).toBe(heading);
      expect(scroll).toHaveBeenCalledOnceWith({ block: 'start', behavior: 'smooth' });
      expect(scroll.calls.mostRecent().object).toBe(heading);
      heading.click();
      await harness.fixture.whenStable();
      expect(heading.getAttribute('aria-expanded')).toBe('false');
    });
  }

  it('responds to parameter changes while the guides page is already open', async () => {
    const scroll = spyOn(HTMLElement.prototype, 'scrollIntoView');
    const harness = await RouterTestingHarness.create('/guides?guide=manage-folders-guide');
    const original = harness.routeNativeElement;
    await harness.navigateByUrl('/guides?guide=manage-experiences-guide');
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement).toBe(original);
    const heading = original!.querySelector('#manage-experiences-guide-heading')!;
    expect(heading.getAttribute('aria-expanded')).toBe('true');
    expect(scroll.calls.mostRecent().object).toBe(heading);
  });

  for (const url of ['/guides', '/guides?guide=unknown', '/guides?guide=%3Cinvalid%5D']) {
    it(`keeps guides collapsed without scrolling for ${url}`, async () => {
      const scroll = spyOn(HTMLElement.prototype, 'scrollIntoView');
      const harness = await RouterTestingHarness.create(url);
      await harness.fixture.whenStable();
      const headings = harness.routeNativeElement!.querySelectorAll('h3 button');
      expect(headings.length).toBe(3);
      for (const heading of headings) expect(heading.getAttribute('aria-expanded')).toBe('false');
      expect(scroll).not.toHaveBeenCalled();
    });
  }
});
