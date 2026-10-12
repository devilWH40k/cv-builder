import { HOME_VIEW_STORAGE_KEY, HomeViewStore } from './home-view-store';

describe('Home view preference', () => {
  let entries: Map<string, string>;

  beforeEach(() => {
    entries = new Map();
    spyOn(Storage.prototype, 'getItem').and.callFake((key) => entries.get(key) ?? null);
    spyOn(Storage.prototype, 'setItem').and.callFake((key, value) => { entries.set(key, value); });
  });

  it('defaults to list view without a saved preference', () => {
    expect(new HomeViewStore().isListView()).toBeTrue();
  });

  for (const mode of ['card', 'list']) {
    it(`restores a saved ${mode} preference`, () => {
      entries.set(HOME_VIEW_STORAGE_KEY, mode);
      expect(new HomeViewStore().isListView()).toBe(mode === 'list');
    });
  }

  it('persists switches and restores them in a fresh store after a reload', () => {
    const store = new HomeViewStore();
    store.toggleView();
    expect(entries.get(HOME_VIEW_STORAGE_KEY)).toBe('card');
    const reloaded = new HomeViewStore();
    expect(reloaded.isListView()).toBeFalse();
    reloaded.toggleView();
    expect(entries.get(HOME_VIEW_STORAGE_KEY)).toBe('list');
    expect(new HomeViewStore().isListView()).toBeTrue();
  });

  it('uses the default for an invalid preference', () => {
    entries.set(HOME_VIEW_STORAGE_KEY, 'invalid');
    expect(new HomeViewStore().isListView()).toBeTrue();
  });

  it('defaults safely when browser storage cannot be read', () => {
    (Storage.prototype.getItem as jasmine.Spy).and.throwError('Storage unavailable');
    expect(new HomeViewStore().isListView()).toBeTrue();
  });

  it('keeps switching in memory when saving the preference fails', () => {
    (Storage.prototype.setItem as jasmine.Spy).and.throwError('Storage unavailable');
    const store = new HomeViewStore();
    expect(() => store.toggleView()).not.toThrow();
    expect(store.isListView()).toBeFalse();
    store.toggleView();
    expect(store.isListView()).toBeTrue();
  });
});
