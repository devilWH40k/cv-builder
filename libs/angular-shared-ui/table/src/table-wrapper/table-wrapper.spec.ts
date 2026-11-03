import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TableCellTemplate } from '../directives/table-cell-template';
import { TableColumn } from '../models/table-column';
import { TableWrapper } from './table-wrapper';

interface TestRecord {
  readonly id: number;
  readonly name: string;
  readonly role: string;
  readonly active: boolean;
}

const records: readonly TestRecord[] = [
  { id: 1, name: 'Alice', role: 'Engineer', active: true },
  { id: 2, name: 'Bob', role: 'Designer', active: false }
];
const columns: readonly TableColumn<TestRecord>[] = [
  { key: 'name', label: 'Name', minWidth: 8, value: (row) => row.name },
  { key: 'role', label: 'Role', minWidth: 10, value: (row) => row.role },
  { key: 'active', label: 'Active', minWidth: 6, grow: 0, searchable: false, value: (row) => row.active },
  { key: 'actions', label: 'Actions', minWidth: 8, grow: 0, hideable: false, searchable: false, stickyRight: true }
];

@Component({
  imports: [TableWrapper, TableCellTemplate],
  template: `
    <app-table-wrapper tableId="first" label="First table" [data]="records()" [columns]="columns" [trackBy]="key">
      <ng-template appTableCell [tableCellOf]="records()" let-record let-column="column">
        <em>{{ column.value?.(record) }}</em>
      </ng-template>
      <ng-template appTableCell="name" [tableCellOf]="records()" let-record let-column="column">
        <strong>{{ column.label }}: {{ record.name }}</strong>
      </ng-template>
      <ng-template appTableCell="actions" [tableCellOf]="records()" let-record>
        <button (click)="selected.set(record.id)">Open {{ record.name }}</button>
      </ng-template>
    </app-table-wrapper>
    <app-table-wrapper tableId="second" label="Second table" [data]="records()" [columns]="columns" [trackBy]="key" />
  `
})
class TableHost {
  readonly records = signal(records);
  readonly columns = columns;
  readonly key = (record: TestRecord) => record.id;
  readonly selected = signal<number | null>(null);
}

describe('Table wrapper', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  async function setup(tableColumns = columns) {
    const fixture = TestBed.createComponent<TableWrapper<TestRecord>>(TableWrapper);
    fixture.componentRef.setInput('tableId', 'test');
    fixture.componentRef.setInput('label', 'Test records');
    fixture.componentRef.setInput('data', records);
    fixture.componentRef.setInput('columns', tableColumns);
    fixture.componentRef.setInput('trackBy', (record: TestRecord) => record.id);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    return { fixture, root };
  }

  it('renders provided values, grid sizing and a trailing sticky action column', async () => {
    const { root } = await setup();
    expect(Array.from(root.querySelectorAll('[role="columnheader"]'), (cell) => cell.textContent))
      .toEqual(['Name', 'Role', 'Active', 'Actions']);
    const row = root.querySelector<HTMLElement>('app-table-row')!;
    expect(row.textContent).toContain('Alice');
    expect(row.textContent).toContain('true');
    expect(root.querySelector('app-table')!.getAttribute('style')).toContain('--table-min-width: 32rem');
    expect(getComputedStyle(row).gridTemplateColumns)
      .toBe(getComputedStyle(root.querySelector('app-table-header')!).gridTemplateColumns);
    expect(getComputedStyle(row.lastElementChild!).position).toBe('sticky');
  });

  it('delegates external search and scope changes without filtering the supplied page locally', async () => {
    const { fixture, root } = await setup();
    const changed = jasmine.createSpy('searchChanged');
    fixture.componentInstance.searchChanged.subscribe(changed);
    fixture.componentRef.setInput('settings', { search: true, externalSearch: true });
    await fixture.whenStable();
    const search = root.querySelector<HTMLInputElement>('#test-search')!;
    search.value = 'unloaded result';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(changed).toHaveBeenCalledWith({ query: 'unloaded result', columns: ['name', 'role'] });
    expect(root.querySelectorAll('app-table-row').length).toBe(2);
    const scope = root.querySelector<HTMLSelectElement>('#test-search-column')!;
    scope.value = 'role';
    scope.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(changed).toHaveBeenCalledWith({ query: 'unloaded result', columns: ['role'] });
    fixture.componentRef.setInput('data', []);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();
    expect(root.querySelector('.empty-state')).toBeNull();
    fixture.componentRef.setInput('loading', false);
    await fixture.whenStable();
    expect(root.querySelector('.empty-state')?.textContent).toContain('No records match your search.');
  });

  it('preserves visibility by column key when columns are reordered or added and data is refreshed', async () => {
    const { fixture, root } = await setup();
    root.querySelector<HTMLButtonElement>('[aria-label="Choose visible columns"]')!.click();
    await fixture.whenStable();
    root.querySelector<HTMLInputElement>('#test-column-name')!.click();
    await fixture.whenStable();
    fixture.componentRef.setInput('columns', [
      columns[1], columns[0], columns[2],
      { key: 'extra', label: 'Extra', initiallyVisible: false, value: (record: TestRecord) => record.id }, columns[3]
    ]);
    fixture.componentRef.setInput('data', [...records, { id: 3, name: 'Cara', role: 'QA', active: true }]);
    await fixture.whenStable();
    expect(Array.from(root.querySelectorAll('[role="columnheader"]'), (cell) => cell.textContent))
      .toEqual(['Role', 'Active', 'Actions']);
    expect(root.querySelector<HTMLInputElement>('#test-column-name')!.checked).toBeFalse();
    expect(root.querySelector<HTMLInputElement>('#test-column-extra')!.checked).toBeFalse();
    expect(root.querySelectorAll('app-table-row').length).toBe(3);
    root.querySelector<HTMLInputElement>('#test-column-extra')!.click();
    await fixture.whenStable();
    expect(root.querySelector('app-table-header')!.textContent).toContain('Extra');
  });

  it('searches case-insensitively across searchable columns and supports clearing', async () => {
    const { fixture, root } = await setup();
    fixture.componentRef.setInput('settings', { search: true });
    await fixture.whenStable();
    const search = root.querySelector<HTMLInputElement>('#test-search')!;
    search.value = '  ENGINEER  ';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(root.querySelectorAll('app-table-row').length).toBe(1);
    expect(root.querySelector('app-table-row')!.textContent).toContain('Alice');
    search.value = 'true';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(root.querySelectorAll('app-table-row').length).toBe(0);
    expect(root.querySelector('[role="status"]')!.textContent).toBe('No records match your search.');
    search.value = '';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(root.querySelectorAll('app-table-row').length).toBe(2);
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('defaults to Any visible column and resets the search scope when its column is hidden or removed', async () => {
    const { fixture, root } = await setup();
    fixture.componentRef.setInput('settings', { search: true });
    await fixture.whenStable();
    const search = root.querySelector<HTMLInputElement>('#test-search')!;
    const scope = root.querySelector<HTMLSelectElement>('#test-search-column')!;
    expect(scope.value).toBe('');
    expect(Array.from(scope.options, (option) => option.text)).toEqual(['Any', 'Name', 'Role']);
    search.value = 'Alice';
    search.dispatchEvent(new Event('input'));
    scope.value = 'role';
    scope.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(root.querySelectorAll('app-table-row').length).toBe(0);
    scope.value = 'name';
    scope.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(root.querySelectorAll('app-table-row').length).toBe(1);
    search.value = 'engineer';
    search.dispatchEvent(new Event('input'));
    scope.value = 'role';
    scope.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(root.querySelectorAll('app-table-row').length).toBe(1);
    root.querySelector<HTMLButtonElement>('[aria-label="Choose visible columns"]')!.click();
    await fixture.whenStable();
    root.querySelector<HTMLInputElement>('#test-column-role')!.click();
    await fixture.whenStable();
    expect(scope.value).toBe('');
    expect(Array.from(scope.options, (option) => option.text)).toEqual(['Any', 'Name']);
    expect(root.querySelectorAll('app-table-row').length).toBe(0);
    root.querySelector<HTMLInputElement>('#test-column-role')!.click();
    await fixture.whenStable();
    expect(root.querySelectorAll('app-table-row').length).toBe(1);
    scope.value = 'role';
    scope.dispatchEvent(new Event('change'));
    fixture.componentRef.setInput('columns', columns.filter((column) => column.key !== 'role'));
    await fixture.whenStable();
    expect(scope.value).toBe('');
    expect(root.querySelectorAll('app-table-row').length).toBe(0);
  });

  it('restores search, scope and configured default visibility', async () => {
    const { fixture, root } = await setup(columns.map((column) => column.key === 'role'
      ? { ...column, initiallyVisible: false } : column));
    fixture.componentRef.setInput('settings', { search: true });
    await fixture.whenStable();
    const search = root.querySelector<HTMLInputElement>('#test-search')!;
    const scope = root.querySelector<HTMLSelectElement>('#test-search-column')!;
    root.querySelector<HTMLInputElement>('#test-column-role')!.click();
    root.querySelector<HTMLInputElement>('#test-column-name')!.click();
    await fixture.whenStable();
    search.value = 'Engineer'; search.dispatchEvent(new Event('input'));
    scope.value = 'role'; scope.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(root.querySelectorAll('app-table-row').length).toBe(1);
    root.querySelector<HTMLButtonElement>('[aria-label="Restore filters to default"]')!.click();
    await fixture.whenStable();
    expect(search.value).toBe('');
    expect(scope.value).toBe('');
    expect(root.querySelector<HTMLInputElement>('#test-column-name')!.checked).toBeTrue();
    expect(root.querySelector<HTMLInputElement>('#test-column-role')!.checked).toBeFalse();
    expect(root.querySelectorAll('app-table-row').length).toBe(2);
    expect(root.querySelector('app-table-header')!.textContent).toBe('NameActiveActions');
  });

  it('keeps search, column select, restore and gear aligned on one row close to the table', async () => {
    const { fixture, root } = await setup();
    fixture.componentRef.setInput('settings', { search: true });
    await fixture.whenStable();
    for (const width of [320, 900]) {
      root.style.width = `${width}px`;
      const search = root.querySelector<HTMLInputElement>('#test-search')!.getBoundingClientRect();
      const scope = root.querySelector<HTMLSelectElement>('#test-search-column')!.getBoundingClientRect();
      const gear = root.querySelector<HTMLButtonElement>('[aria-label="Choose visible columns"]')!.getBoundingClientRect();
      const restore = root.querySelector<HTMLButtonElement>('[aria-label="Restore filters to default"]')!.getBoundingClientRect();
      const table = root.querySelector('app-table')!.getBoundingClientRect();
      expect(search.bottom).toBeCloseTo(scope.bottom, 0);
      expect(scope.bottom).toBeCloseTo(gear.bottom, 0);
      expect(search.top).toBeCloseTo(gear.top, 0);
      expect(restore.bottom).toBeCloseTo(search.bottom, 0);
      expect(table.top - search.bottom).toBeCloseTo(4, 0);
      expect(search.width).toBeGreaterThan(0);
      expect(scope.right).toBeLessThanOrEqual(restore.left);
      expect(restore.right).toBeLessThanOrEqual(gear.left);
      expect(gear.right).toBeLessThanOrEqual(root.getBoundingClientRect().right);
    }
  });

  it('honors settings for toolbar controls and empty messages', async () => {
    const { fixture, root } = await setup();
    fixture.componentRef.setInput('settings', { columnVisibility: false, search: false, emptyMessage: 'No people yet.' });
    fixture.componentRef.setInput('data', []);
    await fixture.whenStable();
    expect(root.querySelector('.table-toolbar')).toBeNull();
    expect(root.querySelector('[role="status"]')!.textContent).toBe('No people yet.');
  });

  it('renders values as text unless a custom cell template is supplied', async () => {
    const { fixture, root } = await setup();
    fixture.componentRef.setInput('data', [{ ...records[0], name: '<b>Alice</b>' }]);
    await fixture.whenStable();
    expect(root.querySelector('app-table-row')!.textContent).toContain('<b>Alice</b>');
    expect(root.querySelector('app-table-row b')).toBeNull();
  });

  it('supports typed cell and action templates and independent controls for multiple tables', async () => {
    const fixture = TestBed.createComponent(TableHost);
    await fixture.whenStable();
    const tables: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('app-table-wrapper');
    expect(tables[0].querySelector('strong')!.textContent).toBe('Name: Alice');
    expect(tables[0].querySelector('em')!.textContent).toBe('Engineer');
    tables[0].querySelector<HTMLButtonElement>('app-table-row button')!.click();
    expect(fixture.componentInstance.selected()).toBe(1);
    tables[0].querySelector<HTMLButtonElement>('[aria-label="Choose visible columns"]')!.click();
    await fixture.whenStable();
    tables[0].querySelector<HTMLInputElement>('#first-column-name')!.click();
    await fixture.whenStable();
    expect(tables[0].querySelector('strong')).toBeNull();
    expect(tables[1].querySelector<HTMLInputElement>('#second-column-name')!.checked).toBeTrue();
    expect(tables[1].querySelector('app-table-header')!.textContent).toContain('Name');
    fixture.componentInstance.records.set([{ ...records[0], name: 'Updated Alice' }]);
    await fixture.whenStable();
    expect(tables[0].querySelector('app-table-row button')!.textContent).toBe('Open Updated Alice');
    expect(tables[1].querySelector('app-table-row')!.textContent).toContain('Updated Alice');
  });
});
