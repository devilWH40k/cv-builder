import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { blankDesign, ConstructorDocument, ConstructorRepository } from 'constructor/core';
import { ConstructorPageComponent, ConstructorSession } from 'constructor/editor';
import { CvDraft, CvInfo } from '../cv/services/cv-draft';
import { ConstructorRoute } from './constructor-route';

describe('Constructor app route', () => {
  it('fills the app grid with the dark loading background and a visible centered spinner', async () => {
    const design = blankDesign();
    let finishLoading!: (design: ConstructorDocument) => void;
    const pending = new Promise<ConstructorDocument>((resolve) => { finishLoading = resolve; });
    const repository = jasmine.createSpyObj<ConstructorRepository>('repository', ['recentlyVisited', 'load', 'recordVisit']);
    repository.recentlyVisited.and.resolveTo([]);
    repository.load.and.returnValue(pending);
    repository.recordVisit.and.resolveTo();
    TestBed.configureTestingModule({ providers: [
      provideZonelessChangeDetection(),
      provideRouter([{ path: 'constructor', component: ConstructorRoute }]),
      { provide: ConstructorRepository, useValue: repository },
    ] });
    spyOn(Storage.prototype, 'getItem').and.returnValue('done');
    const root = document.documentElement;
    const previousTheme = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'dark');
    let harness: RouterTestingHarness | undefined;
    try {
      harness = await RouterTestingHarness.create('/constructor?design=' + design.id);
      const route = harness.routeNativeElement!;
      const content = route.parentElement!;
      content.style.cssText = 'display: grid; min-height: 700px;';
      // Match App's layout: the router outlet does not occupy its own grid row.
      content.querySelector<HTMLElement>('router-outlet')!.style.display = 'none';
      harness.fixture.detectChanges();
      const page = route.querySelector<HTMLElement>('lib-constructor-page')!;
      const spinner = page.querySelector<HTMLElement>('ui-spinner.initial-spinner')!;
      const ring = spinner.querySelector('span')!;
      expect(getComputedStyle(page).backgroundColor).toBe('rgb(11, 18, 32)');
      expect(page.getBoundingClientRect().height).toBeCloseTo(content.getBoundingClientRect().height, 0);
      expect(spinner.getBoundingClientRect().height).toBeGreaterThanOrEqual(192);
      expect(getComputedStyle(ring).visibility).toBe('visible');
      expect(getComputedStyle(ring).width).toBe('32px');
      expect(getComputedStyle(ring).borderTopColor).toBe('rgb(54, 212, 247)');
      const spinnerBounds = spinner.getBoundingClientRect();
      const ringBounds = ring.getBoundingClientRect();
      expect(ringBounds.left + ringBounds.width / 2)
        .toBeCloseTo(spinnerBounds.left + spinnerBounds.width / 2, 0);
    } finally {
      finishLoading(design);
      await harness?.fixture.whenStable();
      if (previousTheme === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', previousTheme);
    }
  });

  it('converts the projected CV preview and forwards unsaved-change confirmation', async () => {
    const repository = jasmine.createSpyObj<ConstructorRepository>('repository', ['recentlyVisited']);
    repository.recentlyVisited.and.resolveTo([]);
    TestBed.configureTestingModule({ providers: [
      provideZonelessChangeDetection(),
      provideRouter([{ path: 'constructor', component: ConstructorRoute }]),
      { provide: ConstructorRepository, useValue: repository },
    ] });
    spyOn(Storage.prototype, 'getItem').and.returnValue('done');
    const info: CvInfo = {
      name: 'Source CV', positionTitle: 'Developer', description: '', photo: null,
      technologies: [], languages: [], experiences: [],
    };
    const draft = TestBed.inject(CvDraft);
    draft.save(info);
    draft.savedId.set('source-id');
    const harness = await RouterTestingHarness.create('/constructor?from=draft');
    await harness.fixture.whenStable();
    const page = harness.routeDebugElement!.query(By.directive(ConstructorPageComponent));
    const session = page.injector.get(ConstructorSession);
    expect(session.document()?.title).toBe('Source CV_design');
    expect(session.document()?.sourceCvId).toBe('source-id');
    expect(session.document()?.pages[0].scene).toContain('Source CV');
    expect(draft.current()).toEqual(info);
    expect(draft.savedId()).toBe('source-id');

    const decision = harness.routeDebugElement!.injector.get(ConstructorRoute).canDeactivate();
    await harness.fixture.whenStable();
    const cancel = Array.from(document.querySelectorAll<HTMLButtonElement>('#leave-constructor button'))
      .find((button) => button.textContent?.trim() === 'Cancel')!;
    expect(cancel).toBeDefined();
    cancel.click();
    expect(await decision).toBeFalse();
    expect(session.document()?.sourceCvId).toBe('source-id');
  });
});
