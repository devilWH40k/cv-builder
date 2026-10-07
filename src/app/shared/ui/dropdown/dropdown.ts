import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, Injector, input, output, signal, viewChild } from '@angular/core';

export interface DropdownItem {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}

@Component({
  selector: 'app-dropdown',
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave()',
    '(focusout)': 'onFocusOut($event)',
    '(keydown)': 'onKeydown($event)',
    '(document:pointerdown)': 'onOutsidePointer($event)'
  }
})
export class Dropdown {
  readonly menuId = input.required<string>();
  readonly label = input.required<string>();
  readonly items = input.required<readonly DropdownItem[]>();
  readonly selected = output<DropdownItem>();
  protected readonly isOpen = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly menu = viewChild.required<ElementRef<HTMLElement>>('menu');
  private openedByHover = false;

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch' || this.isOpen()) return;
    this.openedByHover = true;
    this.isOpen.set(true);
  }

  protected onPointerLeave(): void {
    if (!this.menu().nativeElement.contains(this.document.activeElement)) this.close();
  }

  protected toggle(): void {
    if (this.openedByHover) this.openedByHover = false;
    else this.isOpen.update((open) => !open);
  }

  protected choose(item: DropdownItem): void {
    if (item.disabled) return;
    this.close();
    this.trigger().nativeElement.focus();
    this.selected.emit(item);
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!(event.relatedTarget instanceof Node) || !this.host.nativeElement.contains(event.relatedTarget)) this.close();
  }

  protected onOutsidePointer(event: PointerEvent): void {
    if (event.target instanceof Node && !this.host.nativeElement.contains(event.target)) this.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      this.trigger().nativeElement.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    this.openedByHover = false;
    this.isOpen.set(true);
    afterNextRender(() => {
      if (!this.isOpen()) return;
      const buttons = Array.from(this.menu().nativeElement.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      const index = buttons.findIndex((button) => button === this.document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
        : event.key === 'ArrowDown' ? (index + 1) % buttons.length
        : index <= 0 ? buttons.length - 1 : index - 1;
      buttons[next]?.focus();
    }, { injector: this.injector });
  }

  private close(): void {
    this.isOpen.set(false);
    this.openedByHover = false;
  }
}
