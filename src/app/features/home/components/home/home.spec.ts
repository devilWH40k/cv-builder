import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../../../app.routes';
import { CV_DATABASE_NAME, SavedCvs } from '../../../cv/services/saved-cvs';
import { CvDraft } from '../../../cv/services/cv-draft';
import { Create } from '../../../create/components/create/create';

describe('Saved CV navigation', () => {
  let databaseName: string;
  beforeEach(() => {
    databaseName = 'cv-builder-home-test-' + crypto.randomUUID();
    const entries = new Map<string, string>();
    spyOn(Storage.prototype, 'getItem').and.callFake((key) => entries.get(key) ?? null);
    spyOn(Storage.prototype, 'setItem').and.callFake((key, value) => { entries.set(key, value); });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter(routes), { provide: CV_DATABASE_NAME, useValue: databaseName }]
    });
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Test database is still open.'));
    });
  });

  for (const view of ['card', 'list']) {
  it(`opens a saved ${view}, updates it and starts a separate blank CV`, async () => {
    const saved = TestBed.inject(SavedCvs);
    const id = await saved.save({
      name: 'Ada', positionTitle: 'Engineer', description: 'Hello',
      photo: null, technologies: ['Angular'],
      languages: [{ language: 'English', level: 'Native' }], experiences: []
    }, null);
    const harness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.querySelector('.cv-caption')?.textContent).toContain('Ada');
    if (view === 'list') {
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('.view-toggle')!.click();
      await harness.fixture.whenStable();
    }
    harness.routeNativeElement?.querySelector<HTMLAnchorElement>('.cv-card')!.click();
    await harness.fixture.whenStable();
    const create = harness.routeDebugElement!.componentInstance as Create;
    await harness.fixture.whenStable();
    expect(create.form.controls.name.value).toBe('Ada');
    expect(create.form.controls.languages.length).toBe(1);
    create.form.controls.name.setValue('Updated');
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('app-save-cv-button button')!.click();
    await harness.fixture.whenStable();
    expect((await saved.load(id))?.name).toBe('Updated');
    expect(saved.all().length).toBe(1);
    await harness.navigateByUrl('/');
    expect(harness.routeNativeElement?.querySelector('.cv-list') !== null).toBe(view === 'list');
    expect(harness.routeNativeElement?.querySelector('.view-toggle')?.getAttribute('aria-label'))
      .toBe(view === 'list' ? 'Switch to card view' : 'Switch to list view');
    harness.routeNativeElement?.querySelector<HTMLAnchorElement>('.create-link')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(CvDraft).savedId()).toBeNull();
    expect((harness.routeDebugElement!.componentInstance as Create).form.controls.name.value).toBe('');
    expect(saved.all().length).toBe(1);
  });
  }

  it('switches between cards and compact rows without file sizes', async () => {
    const saved = TestBed.inject(SavedCvs);
    await saved.save({
      name: 'Ada', positionTitle: 'Engineer', description: 'Hidden summary', photo: null,
      languages: [], experiences: [], technologies: ['Angular']
    }, null);
    const harness = await RouterTestingHarness.create('/');
    const toggle = harness.routeNativeElement!.querySelector<HTMLButtonElement>('.view-toggle')!;
    expect(toggle.getAttribute('aria-label')).toBe('Switch to list view');
    toggle.click();
    await harness.fixture.whenStable();
    const row = harness.routeNativeElement!.querySelector('.cv-list .cv-card')!;
    expect(row.querySelector('lucide-icon')).not.toBeNull();
    expect(row.querySelector('.cv-name')?.textContent).toBe('Ada');
    expect(row.querySelector('.cv-position')?.textContent).toBe('Engineer');
    expect(row.querySelector('.cv-size')).toBeNull();
    expect(row.textContent).not.toContain('Hidden summary');
    expect(row.textContent).not.toContain('Angular');
    expect(row.querySelector('.mini-document')).toBeNull();
    expect(toggle.getAttribute('aria-label')).toBe('Switch to card view');
    toggle.click();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.querySelector('.mini-document')).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector('.cv-list')).toBeNull();
  });

  it('loads saved data from a direct URL with a fresh draft', async () => {
    const id = await TestBed.inject(SavedCvs).save({
      name: 'Ada', positionTitle: '', description: '', photo: null,
      languages: [], experiences: [], technologies: []
    }, null);
    const harness = await RouterTestingHarness.create();
    const create = await harness.navigateByUrl('/create?id=' + id, Create);
    await harness.fixture.whenStable();
    expect(create.form.controls.name.value).toBe('Ada');
    expect(TestBed.inject(CvDraft).savedId()).toBe(id);
  });
  for (const view of ['card', 'list']) {
  it(`deletes a ${view} without navigating and shows the empty state`, async () => {
    const saved = TestBed.inject(SavedCvs);
    const id = await saved.save({
      name: 'Ada', positionTitle: '', description: '', photo: null,
      languages: [], experiences: [], technologies: []
    }, null);
    TestBed.inject(CvDraft).savedId.set(id);
    const harness = await RouterTestingHarness.create('/');
    if (view === 'list') {
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('.view-toggle')!.click();
      await harness.fixture.whenStable();
    }
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('.delete-cv')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.querySelector('.cv-card')).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('No saved CVs yet.');
    expect(await saved.load(id)).toBeNull();
    expect(TestBed.inject(CvDraft).savedId()).toBeNull();
  });
  }

  it('keeps the card and reports a failed deletion', async () => {
    await TestBed.inject(SavedCvs).save({
      name: 'Ada', positionTitle: '', description: '', photo: null,
      languages: [], experiences: [], technologies: []
    }, null);
    const harness = await RouterTestingHarness.create('/');
    spyOn(IDBObjectStore.prototype, 'delete').and.throwError('Storage unavailable');
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('.delete-cv')!.click();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.querySelector('.cv-card')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent)
      .toContain('Could not delete this CV.');
  });
});
