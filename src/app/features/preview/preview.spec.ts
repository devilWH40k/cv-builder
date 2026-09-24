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
    photo: null,
    languages: [],
    technologies: []
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
    expect(page.querySelector('.cv-languages')).toBeNull();
    expect(page.querySelector('.cv-technologies')).toBeNull();
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

  it('places languages below the header on the right and restores them when editing', async () => {
    const languages = [
      { language: 'Ukrainian', level: 'Native' },
      { language: 'English', level: 'B2 — Upper-Intermediate' }
    ];
    TestBed.inject(CvDraft).save({ ...info, languages });
    const harness = await RouterTestingHarness.create('/preview');
    const page = harness.routeNativeElement!;
    const section = page.querySelector<HTMLElement>('.cv-languages')!;
    expect(section.querySelector('h3')?.textContent).toBe('Languages:');
    expect(Array.from(section.querySelectorAll('li'), (item) => item.textContent)).toEqual([
      'Ukrainian - Native', 'English - B2'
    ]);
    const documentBounds = page.querySelector('.cv-document')!.getBoundingClientRect();
    expect(section.getBoundingClientRect().left)
      .toBeGreaterThan(documentBounds.left + documentBounds.width / 2);
    expect(section.getBoundingClientRect().top)
      .toBeGreaterThan(page.querySelector('.cv-header')!.getBoundingClientRect().bottom);

    const create = await harness.navigateByUrl('/create', Create);
    expect(create.form.controls.languages.getRawValue()).toEqual(languages);
    expect(harness.routeNativeElement?.querySelectorAll('select').length).toBe(4);
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(CvDraft).current()?.languages).toEqual(languages);
  });

  it('keeps long text inside the document and preserves description line breaks', async () => {
    TestBed.inject(CvDraft).save({ ...info, name: 'A'.repeat(160) });
    const harness = await RouterTestingHarness.create('/preview');
    const document = harness.routeNativeElement!.querySelector<HTMLElement>('.cv-document')!;
    expect(document.scrollWidth).toBe(document.clientWidth);
    expect(getComputedStyle(document.querySelector('.description')!).whiteSpace).toBe('pre-wrap');
  });

  it('shows tools below languages in two columns and preserves them through editing', async () => {
    const technologies = ['Vue', 'MongoDB', 'Angular Material'];
    TestBed.inject(CvDraft).save({
      ...info, technologies, languages: [{ language: 'English', level: 'B2 — Upper-Intermediate' }]
    });
    const harness = await RouterTestingHarness.create('/preview');
    const page = harness.routeNativeElement!;
    const tools = page.querySelector<HTMLElement>('.cv-technologies')!;
    expect(Array.from(tools.querySelectorAll('li'), (item) => item.textContent)).toEqual(technologies);
    const languages = page.querySelector('.cv-languages')!.getBoundingClientRect();
    expect(tools.getBoundingClientRect().top).toBeGreaterThan(languages.bottom);
    expect(tools.getBoundingClientRect().left).toBeCloseTo(languages.left);
    const cards = tools.querySelectorAll('li');
    expect(cards[0].getBoundingClientRect().top).toBe(cards[1].getBoundingClientRect().top);
    expect(cards[2].getBoundingClientRect().top).toBeGreaterThan(cards[0].getBoundingClientRect().top);

    const create = await harness.navigateByUrl('/create', Create);
    expect(create.form.controls.technologies.value).toEqual(technologies);
    expect(harness.routeNativeElement!.querySelectorAll('.skill-chip').length).toBe(3);
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('[aria-label="Remove Vue"]')!.click();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(CvDraft).current()?.technologies).toEqual(['MongoDB', 'Angular Material']);
  });

  it('shows tools when no languages are selected', async () => {
    TestBed.inject(CvDraft).save({ ...info, technologies: ['Vue'] });
    const harness = await RouterTestingHarness.create('/preview');
    expect(harness.routeNativeElement!.querySelector('.cv-languages')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('.cv-technologies li')?.textContent).toBe('Vue');
  });
});
