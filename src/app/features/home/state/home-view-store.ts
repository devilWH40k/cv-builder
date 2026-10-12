import { Injectable, signal } from '@angular/core';

export const HOME_VIEW_STORAGE_KEY = 'cv-builder.home-view';

@Injectable({ providedIn: 'root' })
export class HomeViewStore {
  private readonly listView = signal(this.readPreference());
  readonly isListView = this.listView.asReadonly();

  toggleView(): void {
    this.listView.update((isList) => !isList);
    try {
      localStorage.setItem(HOME_VIEW_STORAGE_KEY, this.listView() ? 'list' : 'card');
    } catch {
      // Optional browser preferences may be blocked; retain the selection for this session.
    }
  }

  private readPreference(): boolean {
    try {
      return localStorage.getItem(HOME_VIEW_STORAGE_KEY) !== 'card';
    } catch {
      return true;
    }
  }
}
