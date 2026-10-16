import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { LucideAngularModule, X } from 'lucide-angular';
import { catchError, distinctUntilChanged, map, of, scan, startWith, switchMap, timer } from 'rxjs';
import { DatePicker } from '../../../../shared/ui/date-picker/date-picker';
import { DateMode, parseCalendarDate } from '../../../../shared/ui/date-picker/date-value';
import { Input } from '../../../../shared/ui/input/input';
import { Select } from '../../../../shared/ui/select/select';
import { AsyncSelect } from '../../../../shared/ui/async-select/async-select';
import { EDUCATION_DEGREES } from '../../../cv/interfaces/education';
import { UniversitiesApi } from '../../data-access/universities-api';
import { createEducationForm } from '../../helpers/cv-form';

interface UniversityLookup {
  readonly status: 'idle' | 'loading' | 'ready' | 'unavailable';
  readonly suggestions: readonly string[];
}

const EMPTY_LOOKUP: UniversityLookup = { status: 'idle', suggestions: [] };

@Component({
  selector: 'app-education-entry',
  imports: [Input, Select, AsyncSelect, DatePicker, LucideAngularModule],
  templateUrl: './education-entry.html',
  styleUrl: './education-entry.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EducationEntry {
  readonly form = input.required<ReturnType<typeof createEducationForm>>();
  readonly index = input.required<number>();
  readonly remove = output<void>();
  private readonly universities = inject(UniversitiesApi);
  protected readonly XIcon = X;
  protected readonly degrees = EDUCATION_DEGREES;
  protected readonly dateFormat = new FormControl('month-year', { nonNullable: true });
  protected readonly dateFormats = [
    { value: 'year', label: 'Year' },
    { value: 'month-year', label: 'Month and year' },
    { value: 'day-month-year', label: 'Day, month and year' }
  ];
  private readonly selectedDateFormat = toSignal(this.dateFormat.valueChanges, { initialValue: 'month-year' });
  protected readonly dateMode = computed<DateMode>(() => {
    const format = this.selectedDateFormat();
    return format === 'year' || format === 'day-month-year' ? format : 'month-year';
  });
  protected readonly parseDate = parseCalendarDate;
  private readonly formEvents = toSignal(toObservable(this.form).pipe(
    switchMap((form) => form.events.pipe(startWith(null)))
  ));
  protected readonly dateError = computed(() => {
    this.formEvents();
    const form = this.form();
    if (!form.touched) return '';
    if (form.hasError('dateOrder')) return 'End date must be on or after the start date.';
    return form.hasError('invalidDate') ? 'Please select a valid date.' : '';
  });
  protected readonly lookup = toSignal(toObservable(this.form).pipe(
    switchMap((form) => form.controls.university.valueChanges.pipe(startWith(''))),
    map((query) => query.trim()),
    distinctUntilChanged(),
    switchMap((query) => query.length < 3
      ? of<UniversityLookup>({ status: 'idle', suggestions: [] })
      : timer(300).pipe(
        switchMap(() => this.universities.search(query)),
        map((suggestions): UniversityLookup => ({ status: 'ready', suggestions })),
        catchError(() => of<UniversityLookup>({ status: 'unavailable', suggestions: [] })),
        startWith<UniversityLookup>({ status: 'loading', suggestions: [] })
      )),
    scan((previous, current): UniversityLookup => current.status === 'loading'
      ? { ...current, suggestions: previous.suggestions } : current, EMPTY_LOOKUP)
  ), { initialValue: EMPTY_LOOKUP });
  protected readonly universityHint = computed(() => {
    switch (this.lookup().status) {
      case 'loading': return 'Looking for universities. You can keep typing.';
      case 'unavailable': return 'Suggestions are unavailable. Enter your university manually.';
      case 'ready': return this.lookup().suggestions.length
        ? 'Choose a suggestion or enter your university manually.'
        : 'No suggestions found. Enter your university manually.';
      default: return 'Type at least 3 characters for suggestions, or enter your university manually.';
    }
  });
  protected readonly universityEmptyText = computed(() => {
    const status = this.lookup().status;
    return status === 'idle' || status === 'unavailable' ? this.universityHint()
      : 'No matching universities. Enter your university manually.';
  });
}
