import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, Injector, input, signal, viewChildren } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ChevronDown, LucideAngularModule } from 'lucide-angular';
import { FormField } from '../form-field/form-field';

@Component({
  selector: 'app-async-select',
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './async-select.html',
  styleUrl: './async-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AsyncSelect extends FormField<string> {
  readonly options = input<readonly string[]>([]);
  readonly loading = input(false);
  readonly helpText = input('');
  readonly emptyText = input('No matching suggestions. You can enter your own value.');
  private readonly injector = inject(Injector);
  private readonly optionElements = viewChildren<ElementRef<HTMLButtonElement>>('option');
  private readonly open = signal(false);
  private readonly highlighted = signal<string | null>(null);
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly expanded = computed(() => this.open() && !this.disabled());
  protected readonly filteredOptions = computed(() => {
    const words = this.value().trim().toLowerCase().split(/\s+/).filter(Boolean);
    return [...new Set(this.options())].filter((option) =>
      words.every((word) => option.toLowerCase().includes(word)));
  });
  protected readonly activeIndex = computed(() => {
    const highlighted = this.highlighted();
    return highlighted === null ? -1 : this.filteredOptions().indexOf(highlighted);
  });
  protected readonly activeId = computed(() => this.expanded() && this.activeIndex() >= 0
    ? this.inputId() + '-option-' + this.activeIndex() : null);

  protected show(): void {
    if (!this.control().disabled) this.open.set(true);
  }

  protected typing(): void {
    this.highlighted.set(null);
    this.show();
  }

  protected toggle(input: HTMLInputElement): void {
    if (this.control().disabled) return;
    const expanded = this.expanded();
    input.focus();
    this.open.set(!expanded);
    this.highlighted.set(null);
  }

  protected close(): void {
    this.open.set(false);
    this.highlighted.set(null);
  }

  protected blur(): void {
    this.control().markAsTouched();
    this.close();
  }

  protected highlight(option: string): void {
    this.highlighted.set(option);
  }

  protected select(option: string): void {
    const control = this.control();
    if (control.disabled) return;
    control.setValue(option);
    control.markAsDirty();
    control.markAsTouched();
    this.close();
  }

  protected keydown(event: KeyboardEvent): void {
    if (this.control().disabled || event.isComposing) return;
    if (event.key === 'Escape' && this.expanded()) {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    } else if (event.key === 'Tab') {
      this.close();
    } else if (event.key === 'Enter' && this.expanded() && this.activeIndex() >= 0) {
      event.preventDefault();
      this.select(this.filteredOptions()[this.activeIndex()]);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const wasExpanded = this.expanded();
      this.show();
      const options = this.filteredOptions();
      if (!options.length) return;
      const current = wasExpanded ? this.activeIndex() : -1;
      const next = current < 0 ? (event.key === 'ArrowDown' ? 0 : options.length - 1)
        : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      this.highlighted.set(options[next]);
      afterNextRender(() => {
        this.optionElements()[this.activeIndex()]?.nativeElement.scrollIntoView({ block: 'nearest' });
      }, { injector: this.injector });
    }
  }
}
