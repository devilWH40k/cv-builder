import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { THEME_STORAGE_KEY, ThemeStore } from './theme-store';

describe('Application theme preference', () => {
  let entries: Map<string, string>;
  let originalTheme: string | undefined;
  let originalMeta: (string | null)[];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    originalTheme = document.documentElement.dataset['theme'];
    originalMeta = ['color-scheme', 'theme-color'].map((name) =>
      document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? null);
    entries = new Map();
    spyOn(Storage.prototype, 'getItem').and.callFake((key) => entries.get(key) ?? null);
    spyOn(Storage.prototype, 'setItem').and.callFake((key, value) => { entries.set(key, value); });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    spyOn(window, 'matchMedia').and.returnValue({ ...media, matches: false });
  });

  afterEach(() => {
    if (originalTheme === undefined) delete document.documentElement.dataset['theme'];
    else document.documentElement.dataset['theme'] = originalTheme;
    ['color-scheme', 'theme-color'].forEach((name, index) => {
      const meta = TestBed.inject(Meta);
      const content = originalMeta[index];
      if (content === null) meta.removeTag(`name="${name}"`);
      else meta.updateTag({ name, content });
    });
  });

  it('uses the browser theme when no preference has been saved', () => {
    expect(TestBed.inject(ThemeStore).theme()).toBe('light');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    (window.matchMedia as jasmine.Spy).and.returnValue({ matches: true });
    expect(TestBed.inject(ThemeStore).theme()).toBe('dark');
    expect(entries.has(THEME_STORAGE_KEY)).toBeFalse();
  });

  for (const theme of ['light', 'dark']) {
    it(`restores saved ${theme} even when the browser prefers the other theme`, () => {
      entries.set(THEME_STORAGE_KEY, theme);
      (window.matchMedia as jasmine.Spy).and.returnValue({ matches: theme !== 'dark' });
      expect(TestBed.inject(ThemeStore).theme()).toBe(theme);
      expect(document.documentElement.dataset['theme']).toBe(theme);
      expect(TestBed.inject(Meta).getTag('name="color-scheme"')?.content).toBe(theme);
      expect(TestBed.inject(Meta).getTag('name="theme-color"')?.content)
        .toBe(theme === 'dark' ? '#0f172a' : '#ffffff');
    });
  }

  it('persists switches, updates browser colors, and restores them after reload', () => {
    const store = TestBed.inject(ThemeStore);
    store.toggleTheme();
    expect(store.isDark()).toBeTrue();
    expect(entries.get(THEME_STORAGE_KEY)).toBe('dark');
    expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(15, 23, 42)');
    expect(getComputedStyle(document.body).color).toBe('rgb(248, 250, 252)');
    expect(getComputedStyle(document.documentElement).colorScheme).toBe('dark');
    expect(TestBed.inject(Meta).getTag('name="theme-color"')?.content).toBe('#0f172a');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const reloaded = TestBed.inject(ThemeStore);
    expect(reloaded.isDark()).toBeTrue();
    reloaded.toggleTheme();
    expect(entries.get(THEME_STORAGE_KEY)).toBe('light');
    expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(document.documentElement).colorScheme).toBe('light');
    expect(TestBed.inject(Meta).getTag('name="theme-color"')?.content).toBe('#ffffff');
  });

  it('uses the browser preference for an invalid saved value', () => {
    entries.set(THEME_STORAGE_KEY, 'invalid');
    (window.matchMedia as jasmine.Spy).and.returnValue({ matches: true });
    expect(TestBed.inject(ThemeStore).isDark()).toBeTrue();
  });

  it('still applies and switches themes when storage is blocked', () => {
    (Storage.prototype.getItem as jasmine.Spy).and.throwError('Storage unavailable');
    (Storage.prototype.setItem as jasmine.Spy).and.throwError('Storage unavailable');
    (window.matchMedia as jasmine.Spy).and.returnValue({ matches: true });
    const store = TestBed.inject(ThemeStore);
    expect(store.theme()).toBe('dark');
    expect(() => store.toggleTheme()).not.toThrow();
    expect(store.isDark()).toBeFalse();
    expect(document.documentElement.dataset['theme']).toBe('light');
    store.toggleTheme();
    expect(store.isDark()).toBeTrue();
  });
});
