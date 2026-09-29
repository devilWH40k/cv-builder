import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { CvDraft, CvInfo } from '../cv/cv-draft';
import { Create } from '../create/create';
import { Preview } from './preview';

describe('CV themes', () => {
  const info: CvInfo = {
    name: 'Alex Morgan', positionTitle: 'Developer', description: 'Building applications.',
    photo: null, languages: [{ language: 'English', level: 'Native' }],
    technologies: ['Angular 2+'], experiences: [{
      company: 'Example', position: 'Developer', startDate: '2023', endDate: '',
      isCurrent: true, technologies: ['TypeScript'], description: '<p>Project work</p>'
    }]
  };

  beforeEach(() => {
    spyOn(window, 'print');
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter(routes)]
    });
  });

  it('defaults older CVs to the unchanged Basic theme', async () => {
    TestBed.inject(CvDraft).save(info);
    const harness = await RouterTestingHarness.create('/preview');
    const page = harness.routeNativeElement!;
    const document = page.querySelector<HTMLElement>('.cv-document')!;
    expect(document.classList.contains('theme-basic')).toBeTrue();
    expect(getComputedStyle(document).backgroundColor).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(document).color).toBe('rgb(0, 0, 0)');
    expect(page.querySelector<HTMLInputElement>('input[name="cv-theme"][value="basic"]')!.checked).toBeTrue();
    expect(getComputedStyle(page.querySelector('.cv-info h2')!).backgroundImage).toBe('none');
  });

  it('switches theme colors immediately without changing layout choices or control styling', async () => {
    const draft = TestBed.inject(CvDraft);
    draft.save({ ...info, structure: {
      sidebarPosition: 'left', technologiesView: 'blocks', sidebarTechnologiesView: 'blocks'
    } });
    const harness = await RouterTestingHarness.create('/preview');
    const page = harness.routeNativeElement!;
    const document = page.querySelector<HTMLElement>('.cv-document')!;
    const controls = page.querySelector('app-structure-options section')!;
    const controlBackground = getComputedStyle(controls).backgroundColor;
    for (const [theme, color] of [
      ['dark-blue', 'rgb(4, 10, 27)'],
      ['dark', 'rgb(16, 17, 20)']
    ]) {
      page.querySelector<HTMLInputElement>('input[name="cv-theme"][value="' + theme + '"]')!.click();
      await harness.fixture.whenStable();
      expect(document.classList.contains('theme-' + theme)).toBeTrue();
      expect(getComputedStyle(document).backgroundColor).toBe(color);
      expect(getComputedStyle(document).color).toBe('rgb(248, 250, 252)');
      const name = getComputedStyle(page.querySelector('.cv-info h2')!);
      expect(name.backgroundImage).toContain('linear-gradient');
      expect(name.backgroundImage).toContain('rgb(54, 212, 247)');
      expect(name.backgroundImage).toContain('rgb(175, 241, 255)');
      const block = getComputedStyle(page.querySelector('.cv-technologies li')!);
      expect(block.color).toBe('rgb(54, 212, 247)');
      expect(block.borderTopColor).toBe('rgb(54, 212, 247)');
      expect(getComputedStyle(page.querySelector('.period')!).color).toBe('rgb(163, 170, 185)');
      expect(getComputedStyle(document).getPropertyValue('print-color-adjust')).toBe('exact');
      expect(getComputedStyle(controls).backgroundColor).toBe(controlBackground);
      expect(draft.current()?.structure?.sidebarPosition).toBe('left');
      expect(draft.current()?.structure?.sidebarTechnologiesView).toBe('blocks');
    }

    page.querySelector<HTMLInputElement>('input[name="cv-theme"][value="basic"]')!.click();
    await harness.fixture.whenStable();
    expect(getComputedStyle(document).backgroundColor).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(page.querySelector('.cv-info h2')!).backgroundImage).toBe('none');
    expect(getComputedStyle(page.querySelector('.cv-technologies li')!).color).toBe('rgb(0, 0, 0)');
  });

  it('preserves the chosen theme when editing and returning to preview', async () => {
    const draft = TestBed.inject(CvDraft);
    draft.save(info);
    const harness = await RouterTestingHarness.create('/preview');
    harness.routeNativeElement!.querySelector<HTMLInputElement>('input[name="cv-theme"][value="dark-blue"]')!.click();
    await harness.fixture.whenStable();
    await harness.navigateByUrl('/create', Create);
    harness.routeNativeElement!.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    await harness.navigateByUrl('/preview', Preview);
    expect(draft.current()?.structure?.theme).toBe('dark-blue');
    expect(harness.routeNativeElement!.querySelector('.cv-document.theme-dark-blue')).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector<HTMLInputElement>('input[name="cv-theme"][value="dark-blue"]')!.checked).toBeTrue();
  });
});
