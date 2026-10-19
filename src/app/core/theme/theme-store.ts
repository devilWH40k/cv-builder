import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Meta } from '@angular/platform-browser';

export type AppTheme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'cv-builder.theme';

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly currentTheme = signal<AppTheme>(this.readPreference());
  readonly theme = this.currentTheme.asReadonly();
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    this.applyTheme();
  }

  toggleTheme(): void {
    this.currentTheme.update((theme) => theme === 'dark' ? 'light' : 'dark');
    this.applyTheme();
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, this.theme());
    } catch { }
  }

  private readPreference(): AppTheme {
    try {
      const preference = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY);
      if (preference === 'light' || preference === 'dark') return preference;
    } catch { }
    return this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light';
  }

  private applyTheme(): void {
    this.document.documentElement.dataset['theme'] = this.theme();
    this.meta.updateTag({ name: 'color-scheme', content: this.theme() });
    this.meta.updateTag({ name: 'theme-color', content: this.isDark() ? '#0f172a' : '#ffffff' });
  }
}
