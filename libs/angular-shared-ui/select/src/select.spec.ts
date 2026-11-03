import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { Select } from './select';

describe('Select', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  it('supports labels with separate values and an enabled empty Any option', async () => {
    const fixture = TestBed.createComponent(Select);
    const control = new FormControl('', { nonNullable: true });
    fixture.componentRef.setInput('inputId', 'test-scope');
    fixture.componentRef.setInput('label', 'Search in');
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('options', [{ value: '', label: 'Any' }, { value: 'company', label: 'Project Name' }]);
    await fixture.whenStable();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(select.options.length).toBe(2);
    expect(select.options[0].text).toBe('Any');
    expect(select.options[0].disabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('.control-wrap').classList.contains('filled')).toBeTrue();
    select.value = 'company';
    select.dispatchEvent(new Event('change'));
    expect(control.value).toBe('company');
    control.setValue('');
    await fixture.whenStable();
    expect(select.selectedOptions[0].text).toBe('Any');
  });

  it('preserves string options and the disabled empty placeholder for existing forms', async () => {
    const fixture = TestBed.createComponent(Select);
    const control = new FormControl('', { nonNullable: true });
    fixture.componentRef.setInput('inputId', 'test-language');
    fixture.componentRef.setInput('label', 'Language');
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('options', ['English', 'Ukrainian']);
    await fixture.whenStable();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(select.options[0].disabled).toBeTrue();
    expect(select.options.length).toBe(3);
    expect(fixture.nativeElement.querySelector('.control-wrap').classList.contains('filled')).toBeFalse();
    select.value = 'English';
    select.dispatchEvent(new Event('change'));
    expect(control.value).toBe('English');
  });
});
