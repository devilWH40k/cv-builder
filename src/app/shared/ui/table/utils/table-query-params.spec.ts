import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Experiences } from '../../../../features/experiences/experiences';
import { ExperiencesApi } from '../../../../features/experiences/services/experiences-api';
import { TableColumn, TableSettings } from '../models/table-column';
import { TableWrapper } from '../table-wrapper/table-wrapper';

interface Person { readonly id: number; readonly name: string; readonly role: string; }

@Component({
  imports: [TableWrapper],
  template: `
    <app-table-wrapper tableId="people" label="People" [data]="people" [columns]="columns" [settings]="settings" [trackBy]="key" />
    <app-table-wrapper tableId="teams" label="Teams" [data]="people" [columns]="columns" [settings]="settings" [trackBy]="key" />
  `
})
class TableRoute {
  readonly people: readonly Person[] = [
    { id: 1, name: 'Alice', role: 'Engineer' }, { id: 2, name: 'Bob', role: 'Designer' }
  ];
  readonly columns: readonly TableColumn<Person>[] = [
    { key: 'name', label: 'Name', value: (person) => person.name },
    { key: 'role', label: 'Role', value: (person) => person.role },
    { key: 'actions', label: 'Actions', hideable: false, searchable: false, stickyRight: true }
  ];
  readonly settings: TableSettings = { search: true, queryParams: true };
  readonly key = (person: Person) => person.id;
}

describe('Table query parameters', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideZonelessChangeDetection(), provideLocationMocks(), provideRouter([
      { path: 'tables', component: TableRoute }, { path: 'experiences', component: Experiences }
    ])
  ] }));

  async function settle(harness: RouterTestingHarness): Promise<void> {
    await harness.fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await harness.fixture.whenStable();
  }

  function field<T extends HTMLElement>(harness: RouterTestingHarness, selector: string): T {
    return harness.routeNativeElement!.querySelector<T>(selector)!;
  }

  function parameters() { return TestBed.inject(Router).parseUrl(TestBed.inject(Router).url).queryParamMap; }

  it('restores all three settings from a direct link and isolates table prefixes', async () => {
    const harness = await RouterTestingHarness.create('/tables?people.search=Alice&people.searchIn=name&people.columns=name');
    await settle(harness);
    expect(field<HTMLInputElement>(harness, '#people-search').value).toBe('Alice');
    expect(field<HTMLSelectElement>(harness, '#people-search-column').value).toBe('name');
    expect(field<HTMLInputElement>(harness, '#people-column-role').checked).toBeFalse();
    const tables = harness.routeNativeElement!.querySelectorAll('app-table-wrapper');
    expect(tables[0].querySelector('app-table-header')!.textContent).toBe('NameActions');
    expect(tables[0].querySelectorAll('app-table-row').length).toBe(1);
    expect(tables[1].querySelectorAll('app-table-row').length).toBe(2);
    expect(field<HTMLInputElement>(harness, '#teams-search').value).toBe('');
  });

  it('updates URL state, preserves unrelated parameters and fragment, and removes default values', async () => {
    const harness = await RouterTestingHarness.create('/tables?page=2&teams.search=Bob#section');
    const search = field<HTMLInputElement>(harness, '#people-search');
    const scope = field<HTMLSelectElement>(harness, '#people-search-column');
    search.value = 'Alice'; search.dispatchEvent(new Event('input'));
    scope.value = 'name'; scope.dispatchEvent(new Event('change'));
    field<HTMLInputElement>(harness, '#people-column-role').click();
    await settle(harness);
    expect(parameters().get('people.search')).toBe('Alice');
    expect(parameters().get('people.searchIn')).toBe('name');
    expect(parameters().get('people.columns')).toBe('name,actions');
    expect(parameters().get('page')).toBe('2');
    expect(parameters().get('teams.search')).toBe('Bob');
    expect(TestBed.inject(Router).parseUrl(TestBed.inject(Router).url).fragment).toBe('section');
    search.value = ''; search.dispatchEvent(new Event('input'));
    scope.value = ''; scope.dispatchEvent(new Event('change'));
    field<HTMLInputElement>(harness, '#people-column-role').click();
    await settle(harness);
    expect(parameters().get('people.search')).toBeNull();
    expect(parameters().get('people.searchIn')).toBeNull();
    expect(parameters().get('people.columns')).toBeNull();
    expect(parameters().get('page')).toBe('2');
  });

  it('restores defaults through the icon button and clears only this table query state', async () => {
    const harness = await RouterTestingHarness.create('/tables?page=2&teams.search=Bob&people.search=Alice&people.searchIn=name&people.columns=name#section');
    await settle(harness);
    field<HTMLButtonElement>(harness, 'app-table-wrapper [aria-label="Restore filters to default"]').click();
    await settle(harness);
    expect(field<HTMLInputElement>(harness, '#people-search').value).toBe('');
    expect(field<HTMLSelectElement>(harness, '#people-search-column').value).toBe('');
    expect(field<HTMLInputElement>(harness, '#people-column-role').checked).toBeTrue();
    expect(parameters().get('people.search')).toBeNull();
    expect(parameters().get('people.searchIn')).toBeNull();
    expect(parameters().get('people.columns')).toBeNull();
    expect(parameters().get('teams.search')).toBe('Bob');
    expect(parameters().get('page')).toBe('2');
    expect(TestBed.inject(Router).parseUrl(TestBed.inject(Router).url).fragment).toBe('section');
  });

  it('restores parameter-only navigation and browser Back and Forward without replacing the page', async () => {
    const first = '/tables?people.search=Alice&people.searchIn=name&people.columns=name';
    const second = '/tables?people.search=Designer&people.searchIn=role&people.columns=role';
    const harness = await RouterTestingHarness.create(first);
    const page = harness.routeNativeElement;
    await harness.navigateByUrl(second);
    await settle(harness);
    expect(harness.routeNativeElement).toBe(page);
    expect(field<HTMLInputElement>(harness, '#people-search').value).toBe('Designer');
    expect(field<HTMLSelectElement>(harness, '#people-search-column').value).toBe('role');
    expect(field<HTMLInputElement>(harness, '#people-column-name').checked).toBeFalse();
    // The harness navigates imperatively without the application's router bootstrap.
    TestBed.inject(Router).setUpLocationChangeListener();
    TestBed.inject(Location).back();
    await settle(harness);
    expect(TestBed.inject(Location).path()).withContext('Location after Back').toBe(first);
    expect(TestBed.inject(Router).url).withContext('Router after Back').toBe(first);
    expect(field<HTMLInputElement>(harness, '#people-search').value).toBe('Alice');
    expect(field<HTMLInputElement>(harness, '#people-column-name').checked).toBeTrue();
    TestBed.inject(Location).forward();
    await settle(harness);
    expect(field<HTMLInputElement>(harness, '#people-search').value).toBe('Designer');
    await harness.navigateByUrl('/tables');
    await settle(harness);
    expect(field<HTMLInputElement>(harness, '#people-search').value).toBe('');
    expect(field<HTMLSelectElement>(harness, '#people-search-column').value).toBe('');
    expect(field<HTMLInputElement>(harness, '#people-column-name').checked).toBeTrue();
    expect(field<HTMLInputElement>(harness, '#people-column-role').checked).toBeTrue();
  });

  it('ignores unknown columns, keeps mandatory actions, and falls back to Any for a hidden search column', async () => {
    const harness = await RouterTestingHarness.create('/tables?people.search=Alice&people.searchIn=role&people.columns=name,obsolete');
    await settle(harness);
    expect(field<HTMLSelectElement>(harness, '#people-search-column').value).toBe('');
    expect(field<HTMLInputElement>(harness, '#people-column-role').checked).toBeFalse();
    field<HTMLInputElement>(harness, '#people-column-name').click();
    await settle(harness);
    expect(parameters().get('people.columns')).toBe('actions');
    expect(parameters().get('people.searchIn')).toBeNull();
    expect(field<HTMLElement>(harness, 'app-table-header').textContent).toBe('Actions');
  });

  it('merges simultaneous updates from multiple tables without losing either state', async () => {
    const harness = await RouterTestingHarness.create('/tables');
    for (const id of ['people', 'teams']) {
      const search = field<HTMLInputElement>(harness, `#${id}-search`);
      search.value = id === 'people' ? 'Alice' : 'Bob';
      search.dispatchEvent(new Event('input'));
    }
    await settle(harness);
    expect(parameters().get('people.search')).toBe('Alice');
    expect(parameters().get('teams.search')).toBe('Bob');
    expect(field<HTMLInputElement>(harness, '#people-search').value).toBe('Alice');
    expect(field<HTMLInputElement>(harness, '#teams-search').value).toBe('Bob');
  });

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
