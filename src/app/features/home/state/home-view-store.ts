import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HomeViewStore {
  private readonly listView = signal(false);
  readonly isListView = this.listView.asReadonly();

  toggleView(): void {
    this.listView.update((isList) => !isList);
  }
}
