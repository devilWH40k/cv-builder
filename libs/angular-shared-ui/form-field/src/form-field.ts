import { computed, Directive, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { startWith, switchMap } from 'rxjs';

@Directive()
export abstract class FormField<T> {
  readonly control = input.required<FormControl<T>>();
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly required = input(false);

  private readonly changes = toSignal(
    toObservable(this.control).pipe(
      switchMap((control) => control.events.pipe(startWith(null)))
    )
  );

  protected readonly invalid = computed(() => {
    this.changes();
    const control = this.control();
    return control.invalid && control.touched;
  });

  protected readonly success = computed(() => {
    this.changes();
    const control = this.control();
    return control.enabled && control.valid && control.dirty && !!control.value;
  });

  protected readonly value = computed(() => {
    this.changes();
    return this.control().value;
  });

  protected readonly disabled = computed(() => {
    this.changes();
    return this.control().disabled;
  });
}
