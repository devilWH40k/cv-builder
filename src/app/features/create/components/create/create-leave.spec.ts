import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CREATE_ROUTES } from '../../create.routes';
import { CvDraft, CvInfo, DEFAULT_CV_STRUCTURE } from '../../../cv/services/cv-draft';
import { SavedCvs } from '../../../cv/services/saved-cvs';
import { SaveCv } from '../../../cv/services/save-cv';
import { Create } from './create';

@Component({ template: '<p>Destination</p>' })
class Destination {}

describe('Leaving the CV editor', () => {
  let harness: RouterTestingHarness;
  let create: Create;
  let router: Router;
  let save: jasmine.Spy<SavedCvs['save']>;
  let windowListeners: jasmine.Spy<typeof window.addEventListener>;
  const info: CvInfo = { name: 'Ada', positionTitle: 'Engineer', description: 'Summary',
    photo: null, languages: [], experiences: [], technologies: [] };

  beforeEach(async () => {
    windowListeners = spyOn(window, 'addEventListener').and.callThrough();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([
      { path: 'create', children: CREATE_ROUTES },
      { path: '', component: Destination },
      { path: 'guides', component: Destination }
    ])] });
    save = spyOn(TestBed.inject(SavedCvs), 'save').and.resolveTo('saved-id');
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    create = await harness.navigateByUrl('/create', Create);
  });

  function button(label: string): HTMLButtonElement {
    return Array.from(document.querySelectorAll<HTMLButtonElement>('#leave-create app-button button'))
      .find((element) => element.textContent?.trim() === label)!;
  }

  async function dialog(): Promise<HTMLDialogElement> {
    // A pending router guard deliberately keeps the app unstable until a choice is made.
    for (let attempt = 0; attempt < 50; attempt++) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      harness.fixture.detectChanges();
      const element = document.querySelector<HTMLDialogElement>('#leave-create');
      if (element?.open) return element;
    }
    throw new Error('The unsaved changes dialog did not open.');
  }

  it('leaves an untouched editor without a dialog', async () => {
    expect(await router.navigateByUrl('/')).toBeTrue();
    expect(document.querySelector('#leave-create')).toBeNull();
  });

  it('cancels Back to home without losing edits, and Leave continues without saving', async () => {
    create.form.controls.name.setValue('Unsaved name');
    harness.routeNativeElement!.querySelector<HTMLAnchorElement>('[aria-label="Back to home"]')!.click();
    await dialog();
    expect(['Cancel', 'Leave', 'Save and leave'].every((label) => !!button(label))).toBeTrue();
    button('Cancel').click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/create');
    expect(create.form.controls.name.value).toBe('Unsaved name');
    const navigation = router.navigateByUrl('/guides');
    await dialog();
    button('Leave').click();
    expect(await navigation).toBeTrue();
    expect(router.url).toBe('/guides');
    expect(save).not.toHaveBeenCalled();
  });

  it('waits for Save and leave to commit and blocks dismissal while saving', async () => {
    create.form.patchValue({ name: info.name, positionTitle: info.positionTitle, description: info.description });
    let finish!: (id: string) => void;
    save.and.returnValue(new Promise((resolve) => { finish = resolve; }));
    const navigation = router.navigateByUrl('/guides');
    const overlay = await dialog();
    button('Save and leave').click();
    harness.fixture.detectChanges();
    expect(router.url).toBe('/create');
    expect(save).toHaveBeenCalledTimes(1);
    expect(Array.from(overlay.querySelectorAll('button')).every((element) => element.disabled)).toBeTrue();
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    harness.fixture.detectChanges();
    expect(overlay.open).toBeTrue();
    finish('saved-id');
    expect(await navigation).toBeTrue();
    expect(router.url).toBe('/guides');
    expect(TestBed.inject(CvDraft).savedId()).toBe('saved-id');
    expect(TestBed.inject(CvDraft).hasUnsavedChanges()).toBeFalse();
  });

  it('keeps the page and dialog open if saving fails and allows retry', async () => {
    create.form.controls.name.setValue('Unsaved');
    save.and.rejectWith(new Error('Storage unavailable'));
    const navigation = router.navigateByUrl('/');
    await dialog();
    button('Save and leave').click();
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      harness.fixture.detectChanges();
      if (document.querySelector('#leave-create [role="alert"]')) break;
    }
    expect(router.url).toBe('/create');
    expect(document.querySelector('#leave-create [role="alert"]')?.textContent).toContain('could not be saved');
    expect(TestBed.inject(CvDraft).hasUnsavedChanges()).toBeTrue();
    save.and.resolveTo('saved-id');
    button('Save and leave').click();
    expect(await navigation).toBeTrue();
  });

  for (const action of ['Escape', 'Close', 'Backdrop']) {
    it(`treats ${action} as Cancel`, async () => {
      create.form.controls.name.setValue('Unsaved');
      const navigation = router.navigateByUrl('/');
      const overlay = await dialog();
      if (action === 'Escape') overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      else if (action === 'Close') overlay.querySelector<HTMLButtonElement>('.close')!.click();
      else overlay.parentElement!.click();
      expect(await navigation).toBeFalse();
      expect(router.url).toBe('/create');
    });
  }

  it('tracks structure changes and clears the prompt after a normal Save', async () => {
    const draft = TestBed.inject(CvDraft);
    draft.updateStructure({ ...DEFAULT_CV_STRUCTURE, sidebarPosition: 'left' });
    const navigation = router.navigateByUrl('/');
    await dialog();
    button('Cancel').click();
    expect(await navigation).toBeFalse();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('app-save-cv-button button')!.click();
    await harness.fixture.whenStable();
    expect(draft.hasUnsavedChanges()).toBeFalse();
    expect(await router.navigateByUrl('/')).toBeTrue();
  });

  it('loads a saved CV cleanly and updates its existing ID when saving before leaving', async () => {
    await router.navigateByUrl('/');
    spyOn(TestBed.inject(SavedCvs), 'load').and.resolveTo(info);
    create = await harness.navigateByUrl('/create?id=existing-id', Create);
    expect(TestBed.inject(CvDraft).hasUnsavedChanges()).toBeFalse();
    create.form.controls.name.setValue('Updated');
    const navigation = router.navigateByUrl('/');
    await dialog();
    button('Save and leave').click();
    expect(await navigation).toBeTrue();
    expect(save.calls.mostRecent().args[1]).toBe('existing-id');
  });

  it('warns on browser unload only while changes are unsaved', async () => {
    const listener = windowListeners.calls.allArgs().find(([name]) => name === 'beforeunload')?.[1];
    if (!listener) throw new Error('The browser unload handler was not registered.');
    // Invoke the registered handler without notifying Karma's own reload detector.
    const unload = (event: Event) => {
      if (typeof listener === 'function') listener.call(window, event);
      else listener.handleEvent(event);
    };
    const cleanEvent = new Event('beforeunload', { cancelable: true });
    unload(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBeFalse();
    create.form.controls.name.setValue('Unsaved');
    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    unload(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBeTrue();
    await TestBed.inject(SaveCv).save(TestBed.inject(CvDraft).current());
    const savedEvent = new Event('beforeunload', { cancelable: true });
    unload(savedEvent);
    expect(savedEvent.defaultPrevented).toBeFalse();
  });
});
