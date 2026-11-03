import { provideLocationMocks } from '@angular/common/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Experiences } from './experiences';
import { ExperiencesApi } from './services/experiences-api';

describe('Experiences table query parameters', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideZonelessChangeDetection(), provideLocationMocks(),
    provideRouter([{ path: 'experiences', component: Experiences }]),
  ] }));

  async function settle(harness: RouterTestingHarness): Promise<void> {
    await harness.fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await harness.fixture.whenStable();
  }

  function field<T extends HTMLElement>(harness: RouterTestingHarness, selector: string): T {
    return harness.routeNativeElement!.querySelector<T>(selector)!;
  }

  it('restores the Experiences table after its records load', async () => {
    spyOn(TestBed.inject(ExperiencesApi), 'getPage').and.resolveTo({ records: [
      { id: '1', updatedAt: 1, experience: { company: 'Project', position: 'Engineer',
        startDate: '', endDate: '', isCurrent: false, description: '', technologies: [] } }
    ], nextOffset: 1, hasMore: false });
    const harness = await RouterTestingHarness.create('/experiences?experience.search=Engineer&experience.searchIn=position&experience.columns=company,position');
    await settle(harness);
    expect(field<HTMLInputElement>(harness, '#experience-search').value).toBe('Engineer');
    expect(field<HTMLSelectElement>(harness, '#experience-search-column').value).toBe('position');
    expect(field<HTMLElement>(harness, 'app-table-header').textContent).toBe('Project NamePositionActions');
    expect(harness.routeNativeElement!.querySelectorAll('app-table-row').length).toBe(1);
  });
});
