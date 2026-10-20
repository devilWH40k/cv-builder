export interface TableColumn<T> {
  readonly key: string;
  readonly label: string;
  readonly value?: (record: T) => string | number | boolean | null | undefined;
  /** Minimum column width in rem. */
  readonly minWidth?: number;
  /** Fraction of remaining width; zero keeps the column at its minimum width. */
  readonly grow?: number;
  readonly hideable?: boolean;
  readonly initiallyVisible?: boolean;
  readonly searchable?: boolean;
  /** Use on the final column to keep it visible while scrolling horizontally. */
  readonly stickyRight?: boolean;
}

export interface TableSettings {
  /** Delegate filtering to the host's data API while retaining table search controls. */
  readonly externalSearch?: boolean;
  /** Sync URL query parameters using tableId, or a custom string, as their prefix. */
  readonly queryParams?: boolean | string;
  readonly columnVisibility?: boolean;
  readonly search?: boolean;
  readonly searchLabel?: string;
  readonly emptyMessage?: string;
  readonly noResultsMessage?: string;
}

export interface TableSearch {
  readonly query: string;
  readonly columns: readonly string[];
}

export interface TableCellContext<T> {
  readonly $implicit: T;
  readonly column: TableColumn<T>;
}
