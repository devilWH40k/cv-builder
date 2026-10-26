import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, Router } from '@angular/router';
import { Home } from './home';
import { CV_DATABASE_NAME, SavedCvs } from '../../../cv/services/saved-cvs';
import { ConstructorRepository } from '../../../constructor/services/constructor-repository';
import { blankDesign } from '../../../constructor/helpers/preview-to-design';

describe('Home library tabs', () => {
  let databaseName: string;
  beforeEach(() => {
    databaseName = 'home-design-tabs-' + crypto.randomUUID();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: '', component: Home }]),
        { provide: CV_DATABASE_NAME, useValue: databaseName },
      ],
    });
    spyOn(Storage.prototype, 'getItem').and.returnValue(null);
  });
  afterEach(async () => {
    TestBed.resetTestingModule();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Database still open.'));
    });
  });

  it('keeps Files as the default and opens saved designs through the Designs tab', async () => {
    await TestBed.inject(SavedCvs).save(
      {
        name: 'Ada CV',
        positionTitle: '',
        description: '',
        photo: null,
        technologies: [],
        languages: [],
        experiences: [],
      },
      null,
    );
    const design = { ...blankDesign(), title: 'Ada design' };
    await TestBed.inject(ConstructorRepository).save(design);
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    const page = harness.routeNativeElement!;
    const tabs = page.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect(Array.from(tabs, (tab) => tab.textContent?.trim())).toEqual(['Files', 'Designs']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(page.querySelector('.storage')).toBeNull();
    expect(page.querySelector('.folder-add')).not.toBeNull();
    expect(page.querySelector('.view-toggle')).not.toBeNull();
    expect(page.querySelector('.saved-toolbar')?.nextElementSibling?.id).toBe('home-files');
    expect(page.querySelector('app-tabs')?.nextElementSibling?.className).toBe('view-actions');
    expect(page.querySelector('#saved-title')?.textContent).toBe('Your CVs');
    expect(page.querySelector('#home-files .cv-name')?.textContent).toContain('Ada CV');
    tabs[1].click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/?tab=designs');
    expect(page.querySelector('.folder-add')).toBeNull();
    expect(page.querySelector('.view-toggle')).toBeNull();
    expect(page.querySelector('#saved-title')?.textContent).toBe('Your designs');
    expect(page.querySelector<HTMLElement>('#home-files')?.hidden).toBeTrue();
    const link = page.querySelector<HTMLAnchorElement>('#home-designs .design-open')!;
    expect(link.textContent).toContain('Ada design');
    expect(link.getAttribute('href')).toBe(`/constructor?design=${design.id}&returnTab=designs`);
    tabs[0].click();
    await harness.fixture.whenStable();
    expect(page.querySelector<HTMLElement>('#home-files')?.hidden).toBeFalse();
    expect(page.querySelector('.folder-add')).not.toBeNull();
    expect(page.querySelector('.view-toggle')).not.toBeNull();
    expect(page.querySelector('#home-files .cv-name')?.textContent).toContain('Ada CV');
  });

  it('supports a direct link to Designs and reports a failed load with a retry', async () => {
    const list = spyOn(TestBed.inject(ConstructorRepository), 'list').and.rejectWith(
      new Error('Unavailable'),
    );
    const harness = await RouterTestingHarness.create('/?tab=designs');
    await harness.fixture.whenStable();
    const page = harness.routeNativeElement!;
    expect(page.querySelector<HTMLElement>('#home-designs')?.hidden).toBeFalse();
    expect(page.querySelector('#home-designs [role="alert"]')?.textContent).toContain(
      'Saved designs could not be loaded',
    );
    list.and.resolveTo([]);
    page.querySelector<HTMLButtonElement>('#home-designs .load-retry')!.click();
    await harness.fixture.whenStable();
    expect(page.querySelector('#home-designs [role="alert"]')).toBeNull();
  });
});
