import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { AsyncSelect } from './async-select';

describe('AsyncSelect', () => {
  let fixture: ComponentFixture<AsyncSelect>;
  let control: FormControl<string>;
  let page: HTMLElement;
  let input: HTMLInputElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(AsyncSelect);
    control = new FormControl('', { nonNullable: true, validators: [Validators.required] });
    fixture.componentRef.setInput('inputId', 'university');
    fixture.componentRef.setInput('label', 'University');
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('required', true);
    fixture.componentRef.setInput('options', ['University of Oxford', 'Oxford Brookes University', 'Harvard University']);
    page = fixture.nativeElement;
    await fixture.whenStable();
    input = page.querySelector('input')!;
  });

  function type(text: string): void {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function key(name: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    return event;
  }

  function options(): string[] {
    return Array.from(page.querySelectorAll('[role="option"]')).map((option) => option.textContent!.trim());
  }

  it('filters all typed words immediately, ignoring case, while async results are loading', async () => {
    type('OXFORD');
    await fixture.whenStable();
    expect(options()).toEqual(['University of Oxford', 'Oxford Brookes University']);
    fixture.componentRef.setInput('loading', true);
    type(' oxford BROOK ');
    await fixture.whenStable();
    expect(options()).toEqual(['Oxford Brookes University']);
    expect(page.textContent).toContain('Loading suggestions');
    expect(control.value).toBe(' oxford BROOK ');

    fixture.componentRef.setInput('options', ['Oxford Brookes University', 'Oxford University', 'Harvard University']);
    fixture.componentRef.setInput('loading', false);
    await fixture.whenStable();
    expect(options()).toEqual(['Oxford Brookes University']);
    type('Harvard');
    await fixture.whenStable();
    expect(options()).toEqual(['Harvard University']);
  });

  it('selects with the pointer, updates the form, and closes without losing input focus', async () => {
    input.focus();
    await fixture.whenStable();
    const option = page.querySelector<HTMLButtonElement>('[role="option"]')!;
    const pointer = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
    option.dispatchEvent(pointer);
    expect(pointer.defaultPrevented).toBeTrue();
    option.click();
    await fixture.whenStable();
    expect(control.value).toBe('University of Oxford');
    expect(control.dirty).toBeTrue();
    expect(control.touched).toBeTrue();
    expect(input.value).toBe('University of Oxford');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(page.querySelector('[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it('navigates options with arrows and selects with Enter using combobox accessibility', async () => {
    spyOn(HTMLElement.prototype, 'scrollIntoView');
    input.focus();
    type('Oxford');
    await fixture.whenStable();
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-controls')).toBe('university-listbox');
    expect(key('ArrowDown').defaultPrevented).toBeTrue();
    await fixture.whenStable();
    expect(input.getAttribute('aria-activedescendant')).toBe('university-option-0');
    key('ArrowDown');
    await fixture.whenStable();
    expect(input.getAttribute('aria-activedescendant')).toBe('university-option-1');
    key('ArrowUp');
    await fixture.whenStable();
    expect(input.getAttribute('aria-activedescendant')).toBe('university-option-0');
    expect(key('Enter').defaultPrevented).toBeTrue();
    await fixture.whenStable();
    expect(control.value).toBe('University of Oxford');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.hasAttribute('aria-activedescendant')).toBeFalse();
  });

  it('drops a highlighted option when results change and leaves Enter available for manual entry', async () => {
    spyOn(HTMLElement.prototype, 'scrollIntoView');
    type('Oxford');
    await fixture.whenStable();
    key('ArrowDown');
    await fixture.whenStable();
    fixture.componentRef.setInput('options', ['Oxford Brookes University']);
    await fixture.whenStable();
    expect(input.hasAttribute('aria-activedescendant')).toBeFalse();
    expect(key('Enter').defaultPrevented).toBeFalse();
    expect(control.value).toBe('Oxford');
  });

  it('closes on Escape, Tab, and blur while preserving free text, and reopens with the chevron', async () => {
    type('My university');
    await fixture.whenStable();
    expect(page.textContent).toContain('No matching suggestions');
    expect(key('Escape').defaultPrevented).toBeTrue();
    await fixture.whenStable();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    page.querySelector<HTMLButtonElement>('.select-toggle')!.click();
    await fixture.whenStable();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(key('Tab').defaultPrevented).toBeFalse();
    await fixture.whenStable();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    input.click();
    await fixture.whenStable();
    input.blur();
    await fixture.whenStable();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(control.value).toBe('My university');
    expect(control.valid).toBeTrue();
    expect(control.touched).toBeTrue();
  });

  it('respects disabled state and exposes hints and validation states', async () => {
    fixture.componentRef.setInput('helpText', 'Enter a university or select a suggestion.');
    control.markAsTouched();
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain('university-hint');
    expect(page.querySelector('#university-hint')?.textContent).toContain('select a suggestion');
    control.disable();
    await fixture.whenStable();
    expect(input.disabled).toBeTrue();
    expect(page.querySelector<HTMLButtonElement>('.select-toggle')!.disabled).toBeTrue();
    input.click();
    key('ArrowDown');
    await fixture.whenStable();
    expect(page.querySelector('[role="listbox"]')).toBeNull();
    expect(control.value).toBe('');
  });
});
