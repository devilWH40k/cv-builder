import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { Create } from '../create/create';
import { CvDraft } from '../cv/cv-draft';

describe('CV preview', () => {
  const info = {
    name: 'Alex Morgan',
    positionTitle: 'Full Stack Developer',
    description: 'Building accessible applications.\nFive years of experience.',
    photo: null
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter(routes)]
    });
  });

  it('redirects to the form when no draft exists', async () => {
    const harness = await RouterTestingHarness.create('/preview');
    expect(TestBed.inject(Router).url).toBe('/create');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('CV Info');
  });

  it('shows the submitted information on an A4 document and prints on Export', async () => {
    const harness = await RouterTestingHarness.create();
    const create = await harness.navigateByUrl('/create', Create);
    create.form.setValue(info);
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();

    const page = harness.routeNativeElement!;
    expect(TestBed.inject(Router).url).toBe('/preview');
    expect(page.querySelector('h1')?.textContent).toBe('Your CV Preview');
    expect(page.querySelector('h2')?.textContent).toBe(info.name);
    expect(page.querySelector('.position')?.textContent).toBe(info.positionTitle);
    expect(page.querySelector('.description')?.textContent).toBe(info.description);
    expect(page.querySelector('.portrait')).toBeNull();
    const document = page.querySelector<HTMLElement>('.cv-document')!;
    const bounds = document.getBoundingClientRect();
    expect(bounds.width).toBeCloseTo(210 * 96 / 25.4, 0);
    expect(bounds.height).toBeCloseTo(297 * 96 / 25.4, 0);
    expect(getComputedStyle(document).color).toBe('rgb(0, 0, 0)');
    expect(getComputedStyle(document).backgroundColor).toBe('rgb(255, 255, 255)');

    const print = spyOn(window, 'print');
    page.querySelector<HTMLButtonElement>('button')!.click();
    expect(print).toHaveBeenCalledTimes(1);

    page.querySelector<HTMLAnchorElement>('a')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/create');
    expect(harness.routeNativeElement?.querySelector<HTMLInputElement>('#name')?.value).toBe(info.name);
    expect(harness.routeNativeElement?.querySelector<HTMLTextAreaElement>('#description')?.value)
      .toBe(info.description);
  });

  it('renders a larger circular photo and keeps it available when returning to edit', async () => {
    const bytes = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII='),
      (character) => character.charCodeAt(0)
    );
    const photo = new File([bytes], 'portrait.png', { type: 'image/png' });
    TestBed.inject(CvDraft).save({ ...info, photo });
    const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
    const harness = await RouterTestingHarness.create('/preview');
    await harness.fixture.whenStable();
    const portrait = harness.routeNativeElement!.querySelector<HTMLImageElement>('.portrait')!;
    await portrait.decode();
    expect(portrait.naturalWidth).toBe(1);
    expect(portrait.getBoundingClientRect().width).toBeGreaterThan(64);
    expect(getComputedStyle(portrait).borderRadius).toBe('50%');
    const url = portrait.src;

    const create = await harness.navigateByUrl('/create', Create);
    expect(create.form.controls.photo.value).toBe(photo);
    expect(revoke).toHaveBeenCalledWith(url);
  });

  it('keeps long text inside the document and preserves description line breaks', async () => {
    TestBed.inject(CvDraft).save({ ...info, name: 'A'.repeat(160) });
    const harness = await RouterTestingHarness.create('/preview');
    const document = harness.routeNativeElement!.querySelector<HTMLElement>('.cv-document')!;
    expect(document.scrollWidth).toBe(document.clientWidth);
    expect(getComputedStyle(document.querySelector('.description')!).whiteSpace).toBe('pre-wrap');
  });
});
