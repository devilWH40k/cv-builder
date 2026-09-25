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
    experiences: [],
      technologies: []
  };

  beforeEach(() => {
    const matchMedia = window.matchMedia.bind(window);
    spyOn(window, 'matchMedia').and.callFake((query) => {
      const media = matchMedia(query);
      Object.defineProperty(media, 'matches', { value: false, configurable: true });
      return media;
    });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter(routes)]
    });
  });


  it('changes structure, places comma-separated tools below the period, and preserves choices when editing', async () => {
    const draft = TestBed.inject(CvDraft);
    draft.save({ ...info, languages: [{ language: 'English', level: 'Native' }],
      technologies: ['Angular'], experiences: [{
        company: 'Example', position: 'Developer', startDate: '2023', endDate: '',
        isCurrent: true, technologies: ['Angular', 'TypeScript'], description: '<p>Built applications.</p>'
      }] });
    const harness = await RouterTestingHarness.create('/preview');
    const page = harness.routeNativeElement!;
    const choose = async (value: string) => {
      page.querySelector<HTMLInputElement>(`input${value === 'blocks' ? '[name="technologies-view"]' : ''}[value="${value}"]`)!.click();
      await harness.fixture.whenStable();
    };
    expect(page.querySelector<HTMLInputElement>('input[value="right"]')!.checked).toBeTrue();
    expect(page.querySelector<HTMLInputElement>('input[name="technologies-view"][value="blocks"]')!.checked).toBeTrue();
    await choose('left');
    const sidebar = page.querySelector('.cv-sidebar')!.getBoundingClientRect();
    expect(sidebar.right).toBeLessThan(page.querySelector('.cv-main')!.getBoundingClientRect().left);
    await choose('comma-separated');
    const period = page.querySelector('.period')!;
    expect(period.nextElementSibling?.textContent?.trim()).toBe('Angular, TypeScript');
    expect(period.nextElementSibling?.nextElementSibling?.className).toBe('project-description');
    expect(page.querySelector('.experience-technologies')).toBeNull();
    expect(page.querySelector('.cv-technologies li')?.textContent).toBe('Angular');
    await choose('blocks');
    expect(page.querySelector('.technologies-inline')).toBeNull();
    expect(page.querySelectorAll('.experience-technologies li').length).toBe(2);
    await choose('right');
    expect(page.querySelector('.cv-sidebar')!.getBoundingClientRect().left)
      .toBeGreaterThan(page.querySelector('.cv-main')!.getBoundingClientRect().right);
    await choose('left');
    await choose('comma-separated');
    await harness.navigateByUrl('/create', Create);
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await harness.fixture.whenStable();
    expect(draft.current()?.structure).toEqual({ sidebarPosition: 'left', technologiesView: 'comma-separated', sidebarTechnologiesView: 'list' });
    expect(harness.routeNativeElement!.querySelector<HTMLInputElement>('input[value="left"]')!.checked).toBeTrue();
    expect(harness.routeNativeElement!.querySelector('.technologies-inline')?.textContent?.trim()).toBe('Angular, TypeScript');
  });

  it('shows icon menus on smaller screens and inline panels on desktop', async () => {
    TestBed.inject(CvDraft).save(info);
    const harness = await RouterTestingHarness.create('/preview');
    const frame = document.createElement('iframe');
    frame.style.height = '1600px';
    document.body.append(frame);
    try {
      const target = frame.contentDocument!;
      for (const style of document.querySelectorAll('style, link[rel="stylesheet"]')) {
        target.head.append(style.cloneNode(true));
      }
      target.body.append(harness.routeNativeElement!.cloneNode(true));
      for (const width of [375, 900, 1440]) {
        frame.style.width = `${width}px`;
        const desktop = width === 1440;
        for (const panel of target.querySelectorAll('dialog')) panel.toggleAttribute('open', desktop);
        expect(target.documentElement.scrollWidth).toBeLessThanOrEqual(width);
        const left = target.querySelector('#structure-panel')!;
        const right = target.querySelector('#actions-panel')!;
        const triggers = target.querySelectorAll<HTMLElement>('.drawer-trigger');
        const viewport = target.querySelector('.document-viewport')!.getBoundingClientRect();
        if (desktop) {
          expect(left.getBoundingClientRect().right).toBeLessThanOrEqual(viewport.left);
          expect(right.getBoundingClientRect().left).toBeGreaterThanOrEqual(viewport.right);
          expect(frame.contentWindow!.getComputedStyle(triggers[0]).display).toBe('none');
        } else {
          expect(frame.contentWindow!.getComputedStyle(left).display).toBe('none');
          expect(frame.contentWindow!.getComputedStyle(right).display).toBe('none');
          expect(triggers[0].getBoundingClientRect().left).toBe(0);
          expect(triggers[1].getBoundingClientRect().right).toBe(width);
          for (const trigger of triggers) {
            expect(frame.contentWindow!.getComputedStyle(trigger).position).toBe('fixed');
            const bounds = trigger.getBoundingClientRect();
            expect(bounds.top + bounds.height / 2).toBe(frame.contentWindow!.innerHeight / 2);
          }
          for (const panel of [left, right]) {
            panel.setAttribute('open', '');
            for (const animation of panel.getAnimations()) animation.finish();
            const bounds = panel.getBoundingClientRect();
            expect(bounds.left).toBeGreaterThanOrEqual(0);
            expect(bounds.right).toBeLessThanOrEqual(width);
            expect(bounds.top).toBe(0);
            panel.removeAttribute('open');
          }
        }
      }
    } finally {
      frame.remove();
    }
  });

  it('updates the CV from the mobile menu and closes actions before exporting', async () => {
    const media = window.matchMedia('(max-width: 80rem)');
    Object.defineProperty(media, 'matches', { value: true, configurable: true });
    (window.matchMedia as jasmine.Spy).and.returnValue(media);
    TestBed.inject(CvDraft).save(info);
    const harness = await RouterTestingHarness.create('/preview');
    await harness.fixture.whenStable();
    const page = harness.routeNativeElement!;
    page.querySelector<HTMLButtonElement>('[aria-label="Open Structure"]')!.click();
    await harness.fixture.whenStable();
    expect(page.querySelector('#structure-panel')!.matches(':modal')).toBeTrue();
    page.querySelector<HTMLInputElement>('input[value="left"]')!.click();
    await harness.fixture.whenStable();
    expect(page.querySelector('.cv-body')!.classList.contains('sidebar-left')).toBeTrue();
    page.querySelector<HTMLButtonElement>('[aria-label="Close Structure"]')!.click();
    await harness.fixture.whenStable();
    page.querySelector<HTMLButtonElement>('[aria-label="Open CV actions"]')!.click();
    await harness.fixture.whenStable();
    expect(page.querySelector('#actions-panel')!.matches(':modal')).toBeTrue();
    const print = spyOn(window, 'print').and.callFake(() => {
      expect(page.querySelector<HTMLDialogElement>('#actions-panel')!.open).toBeFalse();
    });
    page.querySelector<HTMLButtonElement>('.actions app-button button')!.click();
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('omits empty technology lines in comma-separated view', async () => {
    TestBed.inject(CvDraft).save({ ...info,
      structure: { sidebarPosition: 'left', technologiesView: 'comma-separated' },
      experiences: [{ company: 'Example', position: '', startDate: '', endDate: '',
        isCurrent: false, technologies: [], description: '<p>Work</p>' }] });
    const harness = await RouterTestingHarness.create('/preview');
    expect(harness.routeNativeElement!.querySelector('.technologies-inline')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('.experience-technologies')).toBeNull();
  });

  it('scrolls to the top each time the preview opens', async () => {
    TestBed.inject(CvDraft).save(info);
    const scroll = spyOn(window, 'scrollTo');
    const harness = await RouterTestingHarness.create('/preview');
    await harness.fixture.whenStable();
    expect(scroll.calls.count()).toBe(1);
    expect(scroll.calls.mostRecent()).toEqual(jasmine.objectContaining({
      args: [{ top: 0, left: 0, behavior: 'instant' }]
    }));
    scroll.calls.reset();
    await harness.navigateByUrl('/create', Create);
    await harness.fixture.whenStable();
    expect(scroll).not.toHaveBeenCalled();
    await harness.navigateByUrl('/preview');
    await harness.fixture.whenStable();
    expect(scroll.calls.count()).toBe(1);
    expect(scroll.calls.mostRecent()).toEqual(jasmine.objectContaining({
      args: [{ top: 0, left: 0, behavior: 'instant' }]
    }));
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
    expect(page.querySelector('.cv-document h2')?.textContent).toBe(info.name);
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
    Array.from(page.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Export'))!.click();
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
      ...info, technologies, structure: { sidebarPosition: 'right', technologiesView: 'blocks', sidebarTechnologiesView: 'blocks' }, languages: [{ language: 'English', level: 'B2 — Upper-Intermediate' }]
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
    expect(TestBed.inject(CvDraft).current()?.structure?.sidebarTechnologiesView).toBe('blocks');
  });

  it('defaults older CVs to a bullet-free technology list and switches views independently', async () => {
    TestBed.inject(CvDraft).save({ ...info, technologies: ['Angular', 'TypeScript'],
      structure: { sidebarPosition: 'right', technologiesView: 'blocks' } });
    const harness = await RouterTestingHarness.create('/preview');
    const page = harness.routeNativeElement!;
    const section = page.querySelector('.cv-technologies')!;
    const list = page.querySelector<HTMLInputElement>('input[name="sidebar-technologies-view"][value="list"]')!;
    const blocks = page.querySelector<HTMLInputElement>('input[name="sidebar-technologies-view"][value="blocks"]')!;
    const items = section.querySelectorAll('li');
    expect(list.checked).toBeTrue();
    expect(getComputedStyle(section.querySelector('ul')!).listStyleType).toBe('none');
    expect(items[1].getBoundingClientRect().top).toBeGreaterThan(items[0].getBoundingClientRect().top);
    expect(getComputedStyle(items[0]).borderStyle).toBe('none');
    blocks.closest('label')!.click();
    await harness.fixture.whenStable();
    expect(blocks.checked).toBeTrue();
    expect(list.checked).toBeFalse();
    expect(items[0].getBoundingClientRect().top).toBe(items[1].getBoundingClientRect().top);
    expect(getComputedStyle(items[0]).borderStyle).toBe('solid');
    expect(page.querySelector<HTMLInputElement>('input[name="technologies-view"][value="blocks"]')!.checked).toBeTrue();
    list.closest('label')!.click();
    await harness.fixture.whenStable();
    expect(items[1].getBoundingClientRect().top).toBeGreaterThan(items[0].getBoundingClientRect().top);
    expect(TestBed.inject(CvDraft).current()?.structure?.sidebarTechnologiesView).toBe('list');
  });

  it('shows tools when no languages are selected', async () => {
    TestBed.inject(CvDraft).save({ ...info, technologies: ['Vue'] });
    const harness = await RouterTestingHarness.create('/preview');
    expect(harness.routeNativeElement!.querySelector('.cv-languages')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('.cv-technologies li')?.textContent).toBe('Vue');
  });
  it('renders experience beside languages and restores rich text and periods when editing', async () => {
    const experiences = [{ company: 'FINBIT', position: 'Full Stack Developer',
      startDate: '2023-06', endDate: '', isCurrent: true, technologies: ['Angular'],
      description: '<p>A banking platform.</p><ul><li><p>Built <strong>accessible</strong> forms.</p></li></ul><p></p>' }];
    TestBed.inject(CvDraft).save({ ...info, experiences, languages: [{ language: 'English', level: 'Native' }] });
    const harness = await RouterTestingHarness.create('/preview');
    const page = harness.routeNativeElement!;
    const section = page.querySelector('.cv-experience')!;
    expect(section.querySelector('h4')?.textContent).toContain('FINBIT | Full Stack Developer');
    expect(section.querySelector('.period')?.textContent).toContain('June 2023');
    expect(section.querySelector('.period')?.textContent).toContain('Present');
    expect(section.querySelector('.project-description strong')?.textContent).toBe('accessible');
    expect(section.querySelector('.experience-technologies')?.textContent).toContain('Angular');
    expect(section.getBoundingClientRect().right)
      .toBeLessThan(page.querySelector('.cv-languages')!.getBoundingClientRect().left);
    const create = await harness.navigateByUrl('/create', Create);
    expect(create.form.controls.experiences.getRawValue()).toEqual(experiences);
    expect(harness.routeNativeElement?.querySelector('[contenteditable]')?.textContent).toContain('banking platform');
  });

});
