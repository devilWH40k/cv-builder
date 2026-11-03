import { computed, DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { asapScheduler, auditTime, distinctUntilChanged, EMPTY, filter, ignoreElements, map, merge, Subscription, switchMap, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
class TableQueryNavigation {
  private readonly router = inject(Router);
  private pending: Record<string, string | null> = {};
  private scheduled: Subscription | null = null;
  private revision = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.scheduled?.unsubscribe());
  }

  update(route: ActivatedRoute, parameters: Readonly<Record<string, string | null>>): void {
    this.pending = { ...this.pending, ...parameters };
    const revision = ++this.revision;
    this.scheduled?.unsubscribe();
    // Coalesce updates from different tables and retain changes while navigation is pending.
    this.scheduled = asapScheduler.schedule(() => {
      this.scheduled = null;
      void this.router.navigate([], {
        relativeTo: route,
        queryParams: this.pending,
        queryParamsHandling: 'merge',
        preserveFragment: true,
        replaceUrl: true
      }).finally(() => { if (this.revision === revision) this.pending = {}; });
    });
  }
}

interface QueryColumn {
  readonly key: string;
  readonly initiallyVisible?: boolean;
  readonly searchable?: boolean;
  readonly control?: FormControl<boolean>;
}

export interface TableQueryBinding {
  readonly prefix: string;
  readonly searchEnabled: boolean;
  readonly visibilityEnabled: boolean;
  readonly search: FormControl<string>;
  readonly searchColumn: FormControl<string>;
  readonly columns: readonly QueryColumn[];
}

/** Bind form controls to this table's URL parameters without coupling the table to a route. */
export function syncTableQueryParams(binding: () => TableQueryBinding | null): void {
  const router = inject(Router, { optional: true });
  const route = inject(ActivatedRoute, { optional: true });
  if (!router || !route) return;
  const navigation = inject(TableQueryNavigation);

  toObservable(computed(binding)).pipe(
    switchMap((table) => {
      if (!table) return EMPTY;
      const keys = [`${table.prefix}.search`, `${table.prefix}.searchIn`, `${table.prefix}.columns`];
      let restoring = false;
      const routeChanges = route.queryParamMap.pipe(
        map((parameters) => keys.map((key) => parameters.get(key))),
        distinctUntilChanged((previous, current) => previous.every((value, index) => value === current[index])),
        tap(([search, searchIn, columns]) => {
          restoring = true;
          try {
            const visible = columns === null ? null : new Set(columns.split(','));
            for (const column of table.columns) {
              if (!column.control) continue;
              const checked = table.visibilityEnabled && visible !== null
                ? visible.has(column.key) : column.initiallyVisible !== false;
              if (column.control.value !== checked) column.control.setValue(checked);
            }
            const query = table.searchEnabled ? search ?? '' : '';
            const scope = table.searchEnabled && searchIn !== null && table.columns.some((column) => column.key === searchIn
              && column.searchable !== false && (column.control?.value ?? true)) ? searchIn : '';
            if (table.search.value !== query) table.search.setValue(query);
            if (table.searchColumn.value !== scope) table.searchColumn.setValue(scope);
          } finally {
            restoring = false;
          }
        }),
        ignoreElements()
      );
      const controlChanges = merge(
        table.search.valueChanges,
        table.searchColumn.valueChanges,
        ...table.columns.flatMap((column) => column.control ? [column.control.valueChanges] : [])
      ).pipe(
        filter(() => !restoring),
        auditTime(0, asapScheduler),
        tap(() => {
          const visible = table.columns.filter((column) => column.control?.value ?? true);
          const defaults = table.columns.every((column) => !column.control
            || column.control.value === (column.initiallyVisible !== false));
          const scope = table.searchEnabled && visible.some((column) => column.key === table.searchColumn.value
            && column.searchable !== false) ? table.searchColumn.value : '';
          const values = [
            table.searchEnabled ? table.search.value || null : null,
            scope || null,
            table.visibilityEnabled && !defaults ? visible.map((column) => column.key).join(',') : null
          ];
          if (keys.every((key, index) => route.snapshot.queryParamMap.get(key) === values[index])) return;
          navigation.update(route, Object.fromEntries(keys.map((key, index) => [key, values[index]])));
        }),
        ignoreElements()
      );
      return merge(routeChanges, controlChanges);
    }),
    takeUntilDestroyed()
  ).subscribe();
}
