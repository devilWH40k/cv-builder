import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CalendarDays, ChevronLeft, ChevronRight, LucideAngularModule } from 'lucide-angular';
import { FormField } from '../form-field/form-field';
import { DateMode, DateViewMode, formatCalendarDate, parseCalendarDate } from './date-value';

@Component({
  selector: 'app-date-picker',
  imports: [LucideAngularModule],
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DatePicker extends FormField<string> {
  readonly mode = input<DateMode>('month-year');
  readonly startViewMode = input<DateViewMode>('month');
  readonly startFromDate = input<Date | null>(null);
  protected readonly view = signal<DateViewMode>('month');
  protected readonly cursor = signal(new Date());
  protected readonly CalendarIcon = CalendarDays;
  protected readonly PreviousIcon = ChevronLeft;
  protected readonly NextIcon = ChevronRight;
  protected readonly weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  protected readonly displayValue = computed(() => formatCalendarDate(this.value()));
  protected readonly heading = computed(() => {
    const date = this.cursor();
    if (this.view() === 'year') {
      const first = Math.floor(date.getFullYear() / 12) * 12;
      return `${Math.max(1, first)} – ${Math.min(9999, first + 11)}`;
    }
    return new Intl.DateTimeFormat('en', {
      year: 'numeric', ...(this.view() === 'day' ? { month: 'long' } : {})
    }).format(date);
  });
  protected readonly cells = computed(() => {
    const year = this.cursor().getFullYear();
    const month = this.cursor().getMonth();
    if (this.view() === 'year') {
      const first = Math.floor(year / 12) * 12;
      return Array.from({ length: 12 }, (_, index) => ({
        value: first + index, label: String(first + index)
      })).filter((cell) => cell.value >= 1 && cell.value <= 9999);
    }
    if (this.view() === 'month') {
      return Array.from({ length: 12 }, (_, index) => ({
        value: index, label: new Intl.DateTimeFormat('en', { month: 'short' })
          .format(new Date(2000, index, 1))
      }));
    }
    const date = new Date(this.cursor());
    date.setDate(1);
    const offset = (date.getDay() + 6) % 7;
    date.setMonth(month + 1, 0);
    return Array.from({ length: offset + date.getDate() }, (_, index) => ({
      value: index - offset + 1, label: index < offset ? '' : String(index - offset + 1)
    }));
  });

  protected toggle(event: Event, panel: HTMLDetailsElement): void {
    if (this.disabled()) {
      event.preventDefault();
      return;
    }
    if (panel.open) return;
    const initial = this.startFromDate();
    this.cursor.set(parseCalendarDate(this.value()) ??
      (initial && Number.isFinite(initial.getTime()) ? new Date(initial) : new Date()));
    const requested = this.startViewMode();
    this.view.set(this.mode() === 'year' ? 'year' :
      this.mode() === 'month-year' && requested === 'day' ? 'month' : requested);
  }

  protected navigate(direction: number): void {
    const date = new Date(this.cursor());
    date.setDate(1);
    if (this.view() === 'day') date.setMonth(date.getMonth() + direction);
    else date.setFullYear(date.getFullYear() + direction * (this.view() === 'year' ? 12 : 1));
    if (date.getFullYear() >= 1 && date.getFullYear() <= 9999) this.cursor.set(date);
  }

  protected zoomOut(): void {
    this.view.set(this.view() === 'day' ? 'month' : 'year');
  }

  protected select(value: number, panel: HTMLDetailsElement, trigger: HTMLElement): void {
    if (this.disabled()) return;
    const date = new Date(this.cursor());
    date.setDate(1);
    if (this.view() === 'year') date.setFullYear(value);
    else if (this.view() === 'month') date.setMonth(value);
    else date.setDate(value);
    this.cursor.set(date);
    if (this.view() === 'year' && this.mode() !== 'year') this.view.set('month');
    else if (this.view() === 'month' && this.mode() === 'day-month-year') this.view.set('day');
    else {
      const parts = [String(date.getFullYear()).padStart(4, '0')];
      if (this.mode() !== 'year') parts.push(String(date.getMonth() + 1).padStart(2, '0'));
      if (this.mode() === 'day-month-year') parts.push(String(date.getDate()).padStart(2, '0'));
      this.update(parts.join('-'));
      this.close(panel, trigger);
    }
  }

  protected isSelected(value: number): boolean {
    const date = parseCalendarDate(this.value());
    if (!date) return false;
    if (this.view() === 'year') return date.getFullYear() === value;
    return date.getFullYear() === this.cursor().getFullYear() &&
      (this.view() === 'month' ? date.getMonth() === value :
        date.getMonth() === this.cursor().getMonth() && date.getDate() === value);
  }

  protected clear(panel: HTMLDetailsElement, trigger: HTMLElement): void {
    this.update('');
    this.close(panel, trigger);
  }

  protected close(panel: HTMLDetailsElement, trigger: HTMLElement): void {
    panel.open = false;
    this.control().markAsTouched();
    trigger.focus();
  }

  protected leave(event: FocusEvent, panel: HTMLDetailsElement): void {
    if (!(event.relatedTarget instanceof Node) || !panel.contains(event.relatedTarget)) {
      panel.open = false;
      this.control().markAsTouched();
    }
  }

  private update(value: string): void {
    if (this.disabled()) return;
    this.control().setValue(value);
    this.control().markAsDirty();
    this.control().markAsTouched();
  }
}
