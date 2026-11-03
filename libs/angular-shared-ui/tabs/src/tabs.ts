import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface Tab {
  readonly id: string;
  readonly label: string;
  readonly panelId: string;
}

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.html',
  styleUrl: './tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Tabs {
  readonly tabs = input.required<readonly Tab[]>();
  readonly active = model.required<string>();
  readonly label = input('Editor sections');

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const tabs = this.tabs();
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % tabs.length; break;
      case 'ArrowLeft': next = (index - 1 + tabs.length) % tabs.length; break;
      case 'Home': next = 0; break;
      case 'End': next = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    this.active.set(tabs[next].id);
    const button = event.currentTarget;
    if (button instanceof HTMLElement) {
      button.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }
  }
}
