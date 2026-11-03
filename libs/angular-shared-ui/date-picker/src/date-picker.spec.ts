import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { DatePicker } from './date-picker';
import { DateMode, DateViewMode, formatCalendarDate, parseCalendarDate } from './date-value';

describe('Date picker', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [DatePicker], providers: [provideZonelessChangeDetection()]
  }));

  async function setup(mode: DateMode, view: DateViewMode, value = '') {
    const fixture = TestBed.createComponent(DatePicker);
    const control = new FormControl(value, { nonNullable: true });
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('label', 'Start date');
    fixture.componentRef.setInput('inputId', 'start');
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('startViewMode', view);
    fixture.componentRef.setInput('startFromDate', new Date(2024, 1, 15));
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    const details = page.querySelector('details')!;
    page.querySelector('summary')!.click();
    await fixture.whenStable();
    async function choose(label: string) {
      const button = Array.from(page.querySelectorAll<HTMLButtonElement>('.cells button'))
        .find((item) => item.textContent?.trim() === label)!;
      if (!button) throw new Error('Missing ' + label + '; open=' + details.open + '; content=' + page.textContent);
      button.click();
      await fixture.whenStable();
    }
    return { fixture, control, page, details, choose };
  }

  it('selects a year without inventing a month or day', async () => {
    const { control, details, choose } = await setup('year', 'year');
    await choose('2024');
    expect(control.value).toBe('2024');
    expect(control.dirty && control.touched).toBeTrue();
    expect(details.open).toBeFalse();
  });

  it('starts from the configured date and drills from year to month', async () => {
    const { control, page, choose } = await setup('month-year', 'year');
    await choose('2023');
    await choose('Jun');
    expect(control.value).toBe('2023-06');
    expect(page.querySelector('summary')?.textContent).toContain('June 2023');
  });

  it('supports leap days and advances December into the following year', async () => {
    const { control, choose } = await setup('day-month-year', 'day');
    await choose('29');
    expect(control.value).toBe('2024-02-29');
    const next = await setup('day-month-year', 'day', '2023-12-31');
    next.page.querySelector<HTMLButtonElement>('[aria-label="Next period"]')!.click();
    await next.fixture.whenStable();
    await next.choose('1');
    expect(next.control.value).toBe('2024-01-01');
  });

  it('clears dates, closes on Escape, and respects disabled controls', async () => {
    const { control, page, details, fixture } = await setup('month-year', 'month', '2024-02');
    page.querySelector<HTMLButtonElement>('.clear')!.click();
    expect(control.value).toBe('');
    page.querySelector('summary')!.click();
    page.querySelector('summary')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(details.open).toBeFalse();
    control.disable();
    await fixture.whenStable();
    page.querySelector('summary')!.click();
    expect(details.open).toBeFalse();
    expect(page.querySelector('fieldset')!.disabled).toBeTrue();
  });

  it('rejects impossible dates and formats each precision', () => {
    expect(parseCalendarDate('2023-02-29')).toBeNull();
    expect(parseCalendarDate('2024-13')).toBeNull();
    expect(parseCalendarDate('0000')).toBeNull();
    expect(formatCalendarDate('2024')).toBe('2024');
    expect(formatCalendarDate('2024-06')).toBe('June 2024');
    expect(formatCalendarDate('2024-06-03')).toBe('June 3, 2024');
  });
});
