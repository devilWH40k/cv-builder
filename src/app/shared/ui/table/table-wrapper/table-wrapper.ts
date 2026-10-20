import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChildren, effect, input, linkedSignal, output, TemplateRef } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { LucideAngularModule, RotateCcw, Search, Settings } from 'lucide-angular';
import { Tooltip } from '../../../directories/tooltip';
import { Checkbox } from '../../checkbox/checkbox';
import { Dropdown } from '../../dropdown/dropdown';
import { Input } from '../../input/input';
import { Select, SelectOption } from '../../select/select';
import { Table } from '../table/table';
import { TableCell } from '../table-cell/table-cell';
import { TableCellTemplate } from '../directives/table-cell-template';
import { TableCellContext, TableColumn, TableSearch, TableSettings } from '../models/table-column';
import { TableHeader } from '../table-header/table-header';
import { TableRow } from '../table-row/table-row';
import { syncTableQueryParams } from '../utils/table-query-params';

interface ColumnOption<T> {
  readonly column: TableColumn<T>;
  readonly control: FormControl<boolean>;
}

@Component({
  selector: 'app-table-wrapper',
  imports: [NgTemplateOutlet, Table, TableHeader, TableRow, TableCell, Checkbox, Dropdown, Input, Select, Tooltip, LucideAngularModule],
  templateUrl: './table-wrapper.html',
  styleUrl: './table-wrapper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableWrapper<T> {
  readonly tableId = input.required<string>();
  readonly label = input.required<string>();
  readonly data = input.required<readonly T[]>();
  readonly columns = input.required<readonly TableColumn<T>[]>();
  readonly trackBy = input.required<(record: T) => string | number>();
  readonly settings = input<TableSettings>({});
  readonly loading = input(false);
  readonly searchChanged = output<TableSearch>();
  protected readonly SettingsIcon = Settings;
  protected readonly SearchIcon = Search;
  protected readonly RestoreIcon = RotateCcw;
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly searchColumn = new FormControl('', { nonNullable: true });
  protected readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  private readonly selectedSearchColumn = toSignal(this.searchColumn.valueChanges, { initialValue: '' });
  private readonly templates = contentChildren<TableCellTemplate<T>>(TableCellTemplate);
  protected readonly columnOptions = linkedSignal<readonly TableColumn<T>[], readonly ColumnOption<T>[]>({
    source: this.columns,
    computation: (columns, previous) => columns.filter((column) => column.hideable !== false).map((column) => ({
      column,
      control: previous?.value.find((option) => option.column.key === column.key)?.control
        ?? new FormControl(column.initiallyVisible !== false, { nonNullable: true })
    }))
  });
  private readonly visibility = toSignal(toObservable(this.columnOptions).pipe(
    switchMap((options) => options.length
      ? combineLatest(options.map((option) => option.control.valueChanges.pipe(startWith(option.control.value)))).pipe(
        map((values) => new Map(options.map((option, index) => [option.column.key, values[index]])))
      )
      : of(new Map<string, boolean>()))
  ), { initialValue: new Map<string, boolean>() });
  protected readonly visibleColumns = computed(() => {
    const visibility = this.visibility();
    return this.columns().filter((column) => column.hideable === false
      || (visibility.get(column.key) ?? column.initiallyVisible !== false));
  });
  protected readonly headers = computed(() => this.visibleColumns().map((column) => column.label));
  protected readonly gridColumns = computed(() => this.visibleColumns().map((column) => {
    const width = column.minWidth ?? 10;
    const grow = column.grow ?? 1;
    return grow ? `minmax(${width}rem, ${grow}fr)` : `${width}rem`;
  }).join(' '));
  protected readonly minWidth = computed(() => `${this.visibleColumns().reduce((width, column) => width + (column.minWidth ?? 10), 0)}rem`);
  protected readonly stickyLastColumn = computed(() => this.visibleColumns().at(-1)?.stickyRight ?? false);
  private readonly searchableColumns = computed(() => this.visibleColumns().filter((column) => column.searchable !== false));
  protected readonly searchColumnOptions = computed<readonly SelectOption[]>(() => [
    { value: '', label: 'Any' },
    ...this.searchableColumns().map((column) => ({ value: column.key, label: column.label }))
  ]);
  protected readonly filteredData = computed(() => {
    if (this.settings().externalSearch) return this.data();
    const query = this.settings().search ? this.query().trim().toLocaleLowerCase() : '';
    if (!query) return this.data();
    const selected = this.searchableColumns().find((column) => column.key === this.selectedSearchColumn());
    const columns = selected ? [selected] : this.searchableColumns();
    return this.data().filter((record) => columns.some((column) => this.text(record, column).toLocaleLowerCase().includes(query)));
  });

  constructor() {
    syncTableQueryParams(() => {
      const settings = this.settings();
      if (!settings.queryParams) return null;
      const options = this.columnOptions();
      return {
        prefix: typeof settings.queryParams === 'string' ? settings.queryParams : this.tableId(),
        searchEnabled: settings.search === true,
        visibilityEnabled: settings.columnVisibility !== false,
        search: this.search,
        searchColumn: this.searchColumn,
        columns: this.columns().map((column) => ({
          ...column, control: options.find((option) => option.column.key === column.key)?.control
        }))
      };
    });
    effect(() => {
      const selected = this.selectedSearchColumn();
      if (selected && !this.searchableColumns().some((column) => column.key === selected)) {
        this.searchColumn.setValue('');
      }
    });
    effect(() => {
      if (!this.settings().externalSearch) return;
      const selected = this.searchableColumns().find((column) => column.key === this.selectedSearchColumn());
      this.searchChanged.emit({ query: this.query(),
        columns: (selected ? [selected] : this.searchableColumns()).map((column) => column.key) });
    });
  }

  protected restoreDefaults(): void {
    this.search.reset('');
    this.searchColumn.reset('');
    for (const option of this.columnOptions()) {
      option.control.reset(option.column.initiallyVisible !== false);
    }
  }

  protected text(record: T, column: TableColumn<T>): string {
    return String(column.value?.(record) ?? '');
  }

  protected templateFor(key: string): TemplateRef<TableCellContext<T>> | null {
    return (this.templates().find((template) => template.appTableCell() === key)
      ?? this.templates().find((template) => !template.appTableCell()))?.template ?? null;
  }
}
