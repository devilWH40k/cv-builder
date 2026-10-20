import { provideZonelessChangeDetection } from '@angular/core';
import { DeferBlockState, TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../../../app.routes';
import { CV_DATABASE_NAME, SavedCvs } from '../../../cv/services/saved-cvs';
import { CvDraft } from '../../../cv/services/cv-draft';
import { CvPdf } from '../../../cv/services/cv-pdf';
import { Create } from '../../../create/components/create/create';

describe('Saved CV navigation', () => {
  let databaseName: string;
  beforeEach(() => {
    databaseName = 'cv-builder-home-test-' + crypto.randomUUID();
    const entries = new Map<string, string>();
    spyOn(Storage.prototype, 'getItem').and.callFake((key) => entries.get(key) ?? null);
    spyOn(Storage.prototype, 'setItem').and.callFake((key, value) => { entries.set(key, value); });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter(routes), { provide: CV_DATABASE_NAME, useValue: databaseName }]
    });
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Test database is still open.'));
    });
  });

  for (const view of ['card', 'list']) {
  it(`opens a saved ${view}, updates it and starts a separate blank CV`, async () => {
    const saved = TestBed.inject(SavedCvs);
    const id = await saved.save({
      name: 'Ada', positionTitle: 'Engineer', description: 'Hello',
      photo: null, technologies: ['Angular'],
      languages: [{ language: 'English', level: 'Native' }], experiences: []
    }, null);
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.querySelector('.cv-name')?.textContent).toContain('Ada');
    if (view === 'card') {
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('.view-toggle')!.click();
      await harness.fixture.whenStable();
    }
    harness.routeNativeElement?.querySelector<HTMLAnchorElement>('.cv-card')!.click();
    await harness.fixture.whenStable();
    const create = harness.routeDebugElement!.componentInstance as Create;
    await harness.fixture.whenStable();
    expect(create.form.controls.name.value).toBe('Ada');
    expect(create.form.controls.languages.length).toBe(1);
    create.form.controls.name.setValue('Updated');
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('app-save-cv-button button')!.click();
    await harness.fixture.whenStable();
    expect((await saved.load(id))?.name).toBe('Updated');
    expect(saved.all().length).toBe(1);
    await harness.navigateByUrl('/');
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.querySelector('.cv-list') !== null).toBe(view === 'list');
    expect(harness.routeNativeElement?.querySelector('.view-toggle')?.getAttribute('aria-label'))
      .toBe(view === 'list' ? 'Switch to card view' : 'Switch to list view');
    harness.routeNativeElement?.querySelector<HTMLAnchorElement>('.create-link')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(CvDraft).savedId()).toBeNull();
    expect((harness.routeDebugElement!.componentInstance as Create).form.controls.name.value).toBe('');
    expect(saved.all().length).toBe(1);
  });
  }

  it('defaults to compact rows and switches to cards without file sizes', async () => {
    const saved = TestBed.inject(SavedCvs);
    await saved.save({
      name: 'Ada', positionTitle: 'Engineer', description: 'Hidden summary', photo: null,
      languages: [], experiences: [], technologies: ['Angular']
    }, null);
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    const toggle = harness.routeNativeElement!.querySelector<HTMLButtonElement>('.view-toggle')!;
    expect(toggle.getAttribute('aria-label')).toBe('Switch to card view');
    const row = harness.routeNativeElement!.querySelector('.cv-list .cv-card')!;
    expect(row.querySelector('lucide-icon')).not.toBeNull();
    expect(row.querySelector('.cv-name')?.textContent).toBe('Ada');
    expect(row.querySelector('.cv-position')?.textContent).toBe('Engineer');
    expect(row.querySelector('.cv-size')).toBeNull();
    expect(row.textContent).not.toContain('Hidden summary');
    expect(row.textContent).not.toContain('Angular');
    expect(row.querySelector('.mini-document')).toBeNull();
    expect(toggle.getAttribute('aria-label')).toBe('Switch to card view');
    toggle.click();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.querySelector('.mini-document')).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector('.cv-list')).toBeNull();
  });

  it('loads saved data from a direct URL with a fresh draft', async () => {
    const id = await TestBed.inject(SavedCvs).save({
      name: 'Ada', positionTitle: '', description: '', photo: null,
      languages: [], experiences: [], technologies: []
    }, null);
    const harness = await RouterTestingHarness.create();
    const create = await harness.navigateByUrl('/create?id=' + id, Create);
    await harness.fixture.whenStable();
    expect(create.form.controls.name.value).toBe('Ada');
    expect(TestBed.inject(CvDraft).savedId()).toBe(id);
  });
  for (const view of ['card', 'list']) {
  it(`deletes a ${view} without navigating and shows the empty state`, async () => {
    const saved = TestBed.inject(SavedCvs);
    const id = await saved.save({
      name: 'Ada', positionTitle: '', description: '', photo: null,
      languages: [], experiences: [], technologies: []
    }, null);
    TestBed.inject(CvDraft).savedId.set(id);
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    if (view === 'card') {
      harness.routeNativeElement?.querySelector<HTMLButtonElement>('.view-toggle')!.click();
      await harness.fixture.whenStable();
    }
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('.delete-cv')!.click();
    await harness.fixture.whenStable();
    document.querySelector<HTMLButtonElement>('#delete-confirmation .confirm-delete button')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.querySelector('.cv-card')).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('No saved CVs yet.');
    const emptyCollection = harness.routeNativeElement!.querySelector<HTMLElement>('app-cv-collection')!;
    expect(emptyCollection.classList.contains('root-collection')).toBeFalse();
    expect(emptyCollection.getBoundingClientRect().height).toBe(0);
    expect(await saved.load(id)).toBeNull();
    expect(TestBed.inject(CvDraft).savedId()).toBeNull();
  });
  }

  it('keeps the card and reports a failed deletion', async () => {
    await TestBed.inject(SavedCvs).save({
      name: 'Ada', positionTitle: '', description: '', photo: null,
      languages: [], experiences: [], technologies: []
    }, null);
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    spyOn(IDBObjectStore.prototype, 'delete').and.throwError('Storage unavailable');
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('.delete-cv')!.click();
    await harness.fixture.whenStable();
    document.querySelector<HTMLButtonElement>('#delete-confirmation .confirm-delete button')!.click();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.querySelector('.cv-card')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent)
      .toContain('Could not delete this CV.');
  });

  const cvInfo = {
    name: 'Ada', positionTitle: 'Engineer', description: 'Hello', photo: null,
    languages: [], experiences: [], technologies: []
  };

  for (const view of ['card', 'list']) {
    it(`truncates long ${view} folder names responsively without increasing folder height`, async () => {
      const saved = TestBed.inject(SavedCvs);
      const longName = 'Applications '.repeat(10).slice(0, 120);
      await saved.createFolder('Short');
      await saved.createFolder(longName);
      const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
      if (view === 'card') {
        harness.routeNativeElement!.querySelector<HTMLButtonElement>('.view-toggle')!.click();
        await harness.fixture.whenStable();
      }
      const collection = harness.routeNativeElement!.querySelector<HTMLElement>('.root-collection')!;
      const cards = Array.from(collection.querySelectorAll<HTMLButtonElement>('.folder-card'));
      const long = cards.find((card) => card.querySelector('.folder-name')!.textContent === longName)!;
      const short = cards.find((card) => card.querySelector('.folder-name')!.textContent === 'Short')!;
      const name = long.querySelector<HTMLElement>('.folder-name')!;
      let narrowWidth = 0;
      for (const width of [240, 320]) {
        collection.style.width = width + 'px';
        expect(long.getBoundingClientRect().height).toBe(short.getBoundingClientRect().height);
        expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
        expect(getComputedStyle(name).textOverflow).toBe('ellipsis');
        expect(getComputedStyle(name).whiteSpace).toBe('nowrap');
        expect(name.title).toBe(longName);
        expect(long.getAttribute('aria-label')).toBe('Open folder ' + longName);
        if (width === 240) narrowWidth = name.clientWidth;
        else expect(name.clientWidth).not.toBe(narrowWidth);
      }
    });
  }

  function openContextMenu(target: Element): void {
    target.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, button: 2, clientX: 100, clientY: 100
    }));
  }

  for (const view of ['card', 'list']) {
    it(`shows disabled Paste on ${view} folders and collection backgrounds when nothing is cut`, async () => {
      const saved = TestBed.inject(SavedCvs);
      await saved.createFolder('Applications');
      const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
      if (view === 'card') {
        harness.routeNativeElement!.querySelector<HTMLButtonElement>('.view-toggle')!.click();
        await harness.fixture.whenStable();
      }
      const expectDisabledPaste = async (target: Element) => {
        openContextMenu(target);
        await harness.fixture.whenStable();
        const items = document.querySelectorAll<HTMLButtonElement>('.context-menu [role="menuitem"]');
        expect(items.length).toBe(1);
        expect(items[0].textContent?.trim()).toBe('Paste');
        expect(items[0].disabled).toBeTrue();
        items[0].click();
        await harness.fixture.whenStable();
        expect(document.querySelector('.context-menu')).not.toBeNull();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        await harness.fixture.whenStable();
      };
      for (const selector of ['main', '.saved-cvs', '#saved-title', '.saved-toolbar']) {
        const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
        harness.routeNativeElement!.querySelector(selector)!.dispatchEvent(event);
        await harness.fixture.whenStable();
        expect(event.defaultPrevented).toBeFalse();
        expect(document.querySelector('.context-menu')).toBeNull();
      }
      await expectDisabledPaste(harness.routeNativeElement!.querySelector('.root-collection')!);
      await expectDisabledPaste(harness.routeNativeElement!.querySelector('.root-collection .cv-grid')!);
      const folder = harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-card')!;
      await expectDisabledPaste(folder);
      folder.click();
      await harness.fixture.whenStable();
      const dialog = document.querySelector<HTMLDialogElement>('#folder-dialog')!;
      await expectDisabledPaste(dialog);
      await expectDisabledPaste(dialog.querySelector('h2')!);
      await expectDisabledPaste(dialog.querySelector('.empty-state')!);
      expect(dialog.open).toBeTrue();
      expect(saved.folders()[0].cvIds).toEqual([]);
    });

    it(`cuts and pastes a ${view} CV into a folder and back without changing CV contents`, async () => {
      const saved = TestBed.inject(SavedCvs);
      const id = await saved.save(cvInfo, null);
      const folder = await saved.createFolder('Applications');
      const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
      if (view === 'card') {
        harness.routeNativeElement!.querySelector<HTMLButtonElement>('.view-toggle')!.click();
        await harness.fixture.whenStable();
      }
      const source = harness.routeNativeElement!.querySelector<HTMLElement>('[data-cv-id]')!;
      openContextMenu(source.querySelector('a.cv-card')!);
      await harness.fixture.whenStable();
      const menu = document.querySelector<HTMLElement>('.context-menu')!;
      const newTab = menu.querySelector<HTMLAnchorElement>('[data-menu-id="open"]')!;
      expect(newTab.getAttribute('href')).toBe('/create?id=' + id);
      expect(newTab.target).toBe('_blank');
      expect(menu.querySelector<HTMLButtonElement>('[data-menu-id="paste"]')!.disabled).toBeTrue();
      menu.querySelector<HTMLButtonElement>('[data-menu-id="cut"]')!.click();
      await harness.fixture.whenStable();
      expect(source.classList.contains('is-cut')).toBeTrue();
      expect(getComputedStyle(source).opacity).toBe('0.5');
      expect(getComputedStyle(source.querySelector('a.cv-card')!).borderStyle).toBe('dashed');
      openContextMenu(harness.routeNativeElement!.querySelector('.folder-card')!);
      await harness.fixture.whenStable();
      const paste = document.querySelector<HTMLButtonElement>('.context-menu [data-menu-id="paste"]')!;
      expect(paste.disabled).toBeFalse();
      paste.click();
      await harness.fixture.whenStable();
      expect(saved.folders()[0].cvIds).toEqual([id]);
      expect(harness.routeNativeElement!.querySelector('[data-cv-id]')).toBeNull();
      harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-card')!.click();
      await harness.fixture.whenStable();
      const dialog = document.querySelector<HTMLDialogElement>('#folder-dialog')!;
      const inside = dialog.querySelector<HTMLElement>('[data-cv-id]')!;
      expect(inside.classList.contains('is-cut')).toBeFalse();
      openContextMenu(inside.querySelector('a.cv-card')!);
      await harness.fixture.whenStable();
      expect(document.querySelector('.context-menu')?.closest('[inert]')).toBeNull();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await harness.fixture.whenStable();
      expect(dialog.open).toBeTrue();
      expect(document.querySelector('.context-menu')).toBeNull();
      openContextMenu(inside.querySelector('a.cv-card')!);
      await harness.fixture.whenStable();
      document.querySelector<HTMLButtonElement>('.context-menu [data-menu-id="cut"]')!.click();
      await harness.fixture.whenStable();
      dialog.querySelector<HTMLButtonElement>('.close')!.click();
      await harness.fixture.whenStable();
      openContextMenu(harness.routeNativeElement!.querySelector('.root-collection')!);
      await harness.fixture.whenStable();
      document.querySelector<HTMLButtonElement>('.context-menu [data-menu-id="paste"]')!.click();
      await harness.fixture.whenStable();
      expect(saved.folders().find((item) => item.id === folder.id)?.cvIds).toEqual([]);
      expect(harness.routeNativeElement!.querySelector('[data-cv-id]')?.classList.contains('is-cut')).toBeFalse();
      expect(await saved.load(id)).toEqual(cvInfo);
      expect(saved.all().length).toBe(1);
    });
  }

  it('clears cut styling on a same-location paste without duplicating or moving the CV', async () => {
    const saved = TestBed.inject(SavedCvs);
    const id = await saved.save(cvInfo, null);
    const move = spyOn(saved, 'moveCv').and.callThrough();
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    const source = harness.routeNativeElement!.querySelector('a.cv-card')!;
    openContextMenu(source);
    await harness.fixture.whenStable();
    document.querySelector<HTMLButtonElement>('.context-menu [data-menu-id="cut"]')!.click();
    await harness.fixture.whenStable();
    openContextMenu(source);
    await harness.fixture.whenStable();
    document.querySelector<HTMLButtonElement>('.context-menu [data-menu-id="paste"]')!.click();
    await harness.fixture.whenStable();
    expect(move).not.toHaveBeenCalled();
    expect(saved.all().map((cv) => cv.id)).toEqual([id]);
    expect(harness.routeNativeElement!.querySelector('.is-cut')).toBeNull();
  });

  it('allows paste into an empty open folder and keeps the cut CV when a move fails', async () => {
    const saved = TestBed.inject(SavedCvs);
    const id = await saved.save(cvInfo, null);
    const folder = await saved.createFolder('Applications');
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    openContextMenu(harness.routeNativeElement!.querySelector('a.cv-card')!);
    await harness.fixture.whenStable();
    document.querySelector<HTMLButtonElement>('.context-menu [data-menu-id="cut"]')!.click();
    await harness.fixture.whenStable();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-card')!.click();
    await harness.fixture.whenStable();
    const move = spyOn(saved, 'moveCv').and.rejectWith(new Error('Storage unavailable'));
    openContextMenu(document.querySelector('#folder-dialog')!);
    await harness.fixture.whenStable();
    document.querySelector<HTMLButtonElement>('.context-menu [data-menu-id="paste"]')!.click();
    await harness.fixture.whenStable();
    expect(move).toHaveBeenCalledOnceWith(id, folder.id);
    expect(saved.folders()[0].cvIds).toEqual([]);
    expect(harness.routeNativeElement!.querySelector('[data-cv-id]')?.classList.contains('is-cut')).toBeTrue();
    expect(document.querySelector('#folder-dialog [role="alert"]')?.textContent).toContain('could not be moved');
    move.and.callThrough();
    openContextMenu(document.querySelector('#folder-dialog .empty-state')!);
    await harness.fixture.whenStable();
    const paste = document.querySelector<HTMLButtonElement>('.context-menu [data-menu-id="paste"]')!;
    expect(paste.disabled).toBeFalse();
    paste.click();
    await harness.fixture.whenStable();
    expect(document.querySelector('#folder-dialog [data-cv-id]')?.classList.contains('is-cut')).toBeFalse();
    expect(saved.folders()[0].cvIds).toEqual([id]);
  });

  function startDrag(source: Element): void {
    source.scrollIntoView({ block: 'center' });
    const rect = source.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    source.dispatchEvent(new PointerEvent('pointerdown', {
      pointerId: 1, pointerType: 'mouse', button: 0, clientX: x, clientY: y, bubbles: true
    }));
    document.dispatchEvent(new PointerEvent('pointermove', {
      pointerId: 1, clientX: x + 10, clientY: y, bubbles: true, cancelable: true
    }));
  }

  function overTarget(target: Element): void {
    target.scrollIntoView({ block: 'center' });
    const rect = target.getBoundingClientRect();
    document.dispatchEvent(new PointerEvent('pointermove', {
      pointerId: 1, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2,
      bubbles: true, cancelable: true
    }));
  }

  function releaseOn(target: Element): void {
    target.scrollIntoView({ block: 'center' });
    const rect = target.getBoundingClientRect();
    document.dispatchEvent(new PointerEvent('pointerup', {
      pointerId: 1, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2,
      bubbles: true, cancelable: true
    }));
  }

  function onBackdrop(type: 'pointermove' | 'pointerup'): void {
    document.dispatchEvent(new PointerEvent(type, {
      pointerId: 1, clientX: 1, clientY: 1, bubbles: true, cancelable: true
    }));
  }

  async function newFolder(harness: RouterTestingHarness, name: string): Promise<void> {
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-add')!.focus();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-add')!.click();
    await harness.fixture.whenStable();
    const input = document.querySelector<HTMLInputElement>('#folder-name')!;
    input.value = name;
    input.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
  }

  it('creates a named empty folder and allows deleting it without navigation', async () => {
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    await newFolder(harness, '  Applications  ');
    const dialog = document.querySelector<HTMLDialogElement>('#create-folder-dialog')!;
    expect(dialog.open).toBeTrue();
    expect(document.activeElement?.id).toBe('folder-name');
    dialog.querySelector<HTMLButtonElement>('app-button button')!.click();
    await harness.fixture.whenStable();
    expect(document.querySelector('#create-folder-dialog')).toBeNull();
    expect(TestBed.inject(SavedCvs).folders()[0].name).toBe('Applications');
    expect(harness.routeNativeElement!.querySelector('.folder-name')?.textContent).toBe('Applications');
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.delete-folder')!.click();
    await harness.fixture.whenStable();
    document.querySelector<HTMLButtonElement>('#delete-confirmation .confirm-delete button')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(SavedCvs).folders()).toEqual([]);
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('rejects blank names and cancels without storing folders, including Escape and backdrop dismissal', async () => {
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    for (const dismissal of ['cancel', 'escape', 'backdrop']) {
      await newFolder(harness, '   ');
      expect(document.querySelector<HTMLButtonElement>('#create-folder-dialog app-button button')!.disabled).toBeTrue();
      if (dismissal === 'cancel') document.querySelector<HTMLButtonElement>('#create-folder-dialog .cancel')!.click();
      else if (dismissal === 'escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      else document.querySelector<HTMLElement>('.dialog-overlay')!.click();
      await harness.fixture.whenStable();
      expect(document.querySelector('#create-folder-dialog')).toBeNull();
      expect(TestBed.inject(SavedCvs).folders()).toEqual([]);
      expect(document.activeElement).toBe(harness.routeNativeElement!.querySelector('.folder-add'));
    }
  });

  it('keeps the folder creation dialog open for retry when storage fails', async () => {
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    await newFolder(harness, 'Applications');
    const add = spyOn(IDBObjectStore.prototype, 'add').and.throwError('Storage unavailable');
    document.querySelector<HTMLButtonElement>('#create-folder-dialog app-button button')!.click();
    await harness.fixture.whenStable();
    expect(document.querySelector('#create-folder-dialog [role="alert"]')?.textContent).toContain('could not be created');
    expect(document.querySelector<HTMLButtonElement>('#create-folder-dialog app-button button')!.disabled).toBeFalse();
    expect(TestBed.inject(SavedCvs).folders()).toEqual([]);
    add.and.callThrough();
    document.querySelector<HTMLButtonElement>('#create-folder-dialog app-button button')!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(SavedCvs).folders().length).toBe(1);
  });

  it('cancels folder creation without flashing required-field validation', async () => {
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    await newFolder(harness, '');
    const dialog = document.querySelector<HTMLDialogElement>('#create-folder-dialog')!;
    const input = dialog.querySelector<HTMLInputElement>('#folder-name')!;
    const cancel = dialog.querySelector<HTMLButtonElement>('.cancel')!;
    const down = new PointerEvent('pointerdown', { button: 0, bubbles: true, cancelable: true });
    cancel.dispatchEvent(down);
    await harness.fixture.whenStable();
    expect(down.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(dialog.querySelector<HTMLElement>('#folder-name-error')!.textContent?.trim()).toBe('');
    cancel.click();
    expect(dialog.open).toBeFalse();
    await harness.fixture.whenStable();
    expect(document.querySelector('#create-folder-dialog')).toBeNull();
    expect(TestBed.inject(SavedCvs).folders()).toEqual([]);
    expect(document.activeElement).toBe(harness.routeNativeElement!.querySelector('.folder-add'));
  });

  for (const view of ['card', 'list']) {
    it(`moves a ${view} into a folder and drops it outside the dialog to move it back`, async () => {
      const saved = TestBed.inject(SavedCvs);
      const id = await saved.save(cvInfo, null);
      const folder = await saved.createFolder('Applications');
      const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
      if (view === 'card') {
        harness.routeNativeElement!.querySelector<HTMLButtonElement>('.view-toggle')!.click();
        await harness.fixture.whenStable();
      }
      const root = harness.routeNativeElement!;
      const source = root.querySelector<HTMLAnchorElement>('a.cv-card')!;
      expect(source.draggable).toBeFalse();
      startDrag(source);
      await harness.fixture.whenStable();
      expect(getComputedStyle(source.closest('app-draggable')!).display).toBe('none');
      expect(document.querySelector('.app-drag-preview')?.textContent).toContain('Ada');
      const target = root.querySelector('.saved-folder')!;
      const closedIcon = target.querySelector<HTMLElement>('.folder-closed')!;
      const openIcon = target.querySelector<HTMLElement>('.folder-open')!;
      const expectFolderOpen = (open: boolean) => {
        for (const icon of [closedIcon, openIcon]) {
          getComputedStyle(icon).opacity;
          icon.getAnimations().forEach((animation) => animation.finish());
        }
        expect(getComputedStyle(closedIcon).opacity).toBe(open ? '0' : '1');
        expect(getComputedStyle(openIcon).opacity).toBe(open ? '1' : '0');
      };
      expectFolderOpen(false);
      overTarget(target);
      await harness.fixture.whenStable();
      expect(target.classList.contains('drop-target')).toBeTrue();
      expectFolderOpen(true);
      overTarget(root.querySelector('#saved-title')!);
      await harness.fixture.whenStable();
      expectFolderOpen(false);
      overTarget(target);
      await harness.fixture.whenStable();
      expectFolderOpen(true);
      releaseOn(target);
      await harness.fixture.whenStable();
      expectFolderOpen(false);
      expect(root.querySelector('a.cv-card')).toBeNull();
      expect(saved.folders()[0].cvIds).toEqual([id]);
      expect(document.querySelector('.app-drag-preview')).toBeNull();
      expect(root.querySelector<HTMLButtonElement>('.delete-folder')!.disabled).toBeTrue();
      if (view === 'list') expect(root.querySelector('.folder-count')?.textContent).toBe('1');
      root.querySelector<HTMLButtonElement>('.folder-card')!.click();
      await harness.fixture.whenStable();
      const dialog = document.querySelector<HTMLDialogElement>('#folder-dialog')!;
      expect(dialog.open).toBeTrue();
      expect(dialog.querySelector('h2')?.textContent).toBe(folder.name);
      expect(dialog.querySelector('.cv-list') !== null).toBe(view === 'list');
      const inside = dialog.querySelector('a.cv-card')!;
      startDrag(inside);
      await harness.fixture.whenStable();
      expect(getComputedStyle(inside.closest('app-draggable')!).display).toBe('none');
      expect(saved.folders()[0].cvIds).toEqual([id]);
      const backdrop = document.querySelector('.dialog-overlay')!;
      onBackdrop('pointermove');
      await harness.fixture.whenStable();
      expect(backdrop.classList.contains('drop-target')).toBeTrue();
      onBackdrop('pointerup');
      await harness.fixture.whenStable();
      expect(saved.folders()[0].cvIds).toEqual([]);
      expect(dialog.querySelector('a.cv-card')).toBeNull();
      expect(dialog.textContent).toContain('This folder is empty');
      expect(root.querySelector('a.cv-card')).not.toBeNull();
      dialog.querySelector<HTMLButtonElement>('.close')!.click();
      await harness.fixture.whenStable();
      expect(root.querySelector<HTMLButtonElement>('.delete-folder')!.disabled).toBeFalse();
      if (view === 'list') expect(root.querySelector('.folder-count')?.textContent).toBe('0');
      expect(TestBed.inject(Router).url).toBe('/');
    });

    it(`opens and edits a folder CV in ${view} mode and preserves its folder`, async () => {
      const saved = TestBed.inject(SavedCvs);
      const id = await saved.save(cvInfo, null);
      const folder = await saved.createFolder('Applications');
      await saved.moveCv(id, folder.id);
      const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
      if (view === 'card') {
        harness.routeNativeElement!.querySelector<HTMLButtonElement>('.view-toggle')!.click();
        await harness.fixture.whenStable();
      }
      harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-card')!.click();
      await harness.fixture.whenStable();
      document.querySelector<HTMLAnchorElement>('#folder-dialog a.cv-card')!.click();
      await harness.fixture.whenStable();
      const create = harness.routeDebugElement!.componentInstance as Create;
      expect(create.form.controls.name.value).toBe('Ada');
      expect(document.querySelector('.dialog-overlay')).toBeNull();
      create.form.controls.name.setValue('Updated');
      harness.routeNativeElement!.querySelector<HTMLButtonElement>('app-save-cv-button button')!.click();
      await harness.fixture.whenStable();
      await harness.navigateByUrl('/');
    await harness.fixture.whenStable();
      expect(harness.routeNativeElement!.querySelector('.cv-list') !== null).toBe(view === 'list');
      expect(harness.routeNativeElement!.querySelector('a.cv-card')).toBeNull();
      expect(saved.folders()[0].cvIds).toEqual([id]);
      harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-card')!.click();
      await harness.fixture.whenStable();
      expect(document.querySelector('#folder-dialog')?.textContent).toContain('Updated');
    });
  }

  for (const view of ['card', 'list']) {
    for (const location of ['main collection', 'folder']) {
      it(`reorders ${view} CVs in the ${location}, highlights insertion points, and keeps order after navigation`, async () => {
        const saved = TestBed.inject(SavedCvs);
        await saved.importRecords(['a', 'b', 'c'].map((id, index) => ({
          id, updatedAt: 3 - index, info: { ...cvInfo, name: id }
        })));
        let folderId: string | null = null;
        if (location === 'folder') {
          const folder = await saved.createFolder('Applications');
          folderId = folder.id;
          for (const id of ['a', 'b', 'c']) await saved.moveCv(id, folder.id);
        }
        const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
        if (view === 'card') {
          harness.routeNativeElement!.querySelector<HTMLButtonElement>('.view-toggle')!.click();
          await harness.fixture.whenStable();
        }
        if (folderId) {
          harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-card')!.click();
          await harness.fixture.whenStable();
        }
        const collection = () => folderId ? document.querySelector('#folder-dialog')! : harness.routeNativeElement!;
        const ids = () => Array.from(collection().querySelectorAll<HTMLElement>('[data-cv-id]')).map((cv) => cv.dataset['cvId']);
        expect(ids()).toEqual(['a', 'b', 'c']);
        expect(collection().querySelector('.insert-target')).toBeNull();
        const source = collection().querySelector<HTMLElement>('[data-cv-id="c"]')!;
        const sourceBounds = source.getBoundingClientRect();
        startDrag(source.querySelector('a.cv-card')!);
        await harness.fixture.whenStable();
        const target = collection().querySelector<HTMLElement>('[data-cv-id="b"] .insert-before')!;
        target.scrollIntoView({ block: 'center' });
        const rect = target.getBoundingClientRect();
        const x = rect.left + rect.width * (view === 'list' ? 0.5 : 0.25);
        const y = rect.top + (view === 'list' ? 2 : rect.height / 2);
        document.dispatchEvent(new PointerEvent('pointermove', {
          pointerId: 1, clientX: x, clientY: y, bubbles: true, cancelable: true
        }));
        await harness.fixture.whenStable();
        expect(target.classList.contains('drop-target')).toBeTrue();
        const placeholder = collection().querySelector<HTMLElement>('.cv-placeholder')!;
        const placeholderStyle = getComputedStyle(placeholder);
        expect(placeholderStyle.borderColor).toBe('rgb(54, 212, 247)');
        expect(placeholderStyle.borderStyle).toBe('solid');
        expect(placeholderStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(placeholder.getBoundingClientRect().height).toBeCloseTo(sourceBounds.height, 0);
        expect(placeholder.getBoundingClientRect().width).toBeCloseTo(sourceBounds.width, 0);
        const hit = placeholder.querySelector<HTMLElement>('.placeholder-hit')!;
        overTarget(hit);
        await harness.fixture.whenStable();
        expect(collection().querySelectorAll('.cv-placeholder').length).toBe(1);
        const card = collection().querySelector<HTMLElement>('[data-cv-id="b"]')!;
        overTarget(card);
        await harness.fixture.whenStable();
        expect(collection().querySelector('.cv-placeholder')).toBe(placeholder);
        const targetBounds = target.getBoundingClientRect();
        const itemBounds = target.parentElement!.getBoundingClientRect();
        expect(view === 'list' ? targetBounds.top < itemBounds.top : targetBounds.left < itemBounds.left).toBeTrue();
        const persistOrder = saved.reorderCv.bind(saved);
        let finishSave!: () => void;
        const saveReady = new Promise<void>((resolve) => { finishSave = resolve; });
        spyOn(saved, 'reorderCv').and.callFake(async (reorder) => {
          await saveReady;
          await persistOrder(reorder);
        });
        releaseOn(card);
        harness.fixture.detectChanges();
        // The drop replaces its placeholder before storage finishes, without restoring the old order.
        expect(ids()).toEqual(['a', 'c', 'b']);
        expect(collection().querySelector('[data-cv-id="c"] .cv-card')!.getAnimations().length).toBe(0);
        expect(collection().querySelector('.cv-placeholder')).toBeNull();
        finishSave();
        await harness.fixture.whenStable();
        expect(ids()).toEqual(['a', 'c', 'b']);
        expect(collection().querySelector('.insert-target')).toBeNull();
        expect(collection().querySelector('.cv-placeholder')).toBeNull();
        expect(document.querySelector('.app-drag-preview')).toBeNull();
        if (folderId) expect(saved.folders()[0].cvIds).toEqual(['a', 'b', 'c']);
        await harness.navigateByUrl('/guides');
        await harness.navigateByUrl('/');
    await harness.fixture.whenStable();
        await harness.fixture.whenStable();
        if (folderId) {
          harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-card')!.click();
          await harness.fixture.whenStable();
        }
        expect(ids()).toEqual(['a', 'c', 'b']);
      });
    }
  }

  it('keeps CV order unchanged when insertion is cancelled or storage fails', async () => {
    const saved = TestBed.inject(SavedCvs);
    await saved.importRecords(['a', 'b', 'c'].map((id, index) => ({ id, updatedAt: 3 - index, info: cvInfo })));
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    const root = harness.routeNativeElement!;
    const ids = () => Array.from(root.querySelectorAll<HTMLElement>('[data-cv-id]')).map((cv) => cv.dataset['cvId']);
    startDrag(root.querySelector('[data-cv-id="c"] a.cv-card')!);
    await harness.fixture.whenStable();
    overTarget(root.querySelector('[data-cv-id="a"] .insert-before')!);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(root.querySelector('.insert-target')).toBeNull();
    expect(root.querySelector('.cv-placeholder')).toBeNull();
    let failSave!: (error: Error) => void;
    spyOn(saved, 'reorderCv').and.returnValue(new Promise<void>((_, reject) => { failSave = reject; }));
    startDrag(root.querySelector('[data-cv-id="c"] a.cv-card')!);
    await harness.fixture.whenStable();
    releaseOn(root.querySelector('[data-cv-id="a"] .insert-before')!);
    harness.fixture.detectChanges();
    expect(ids()).toEqual(['c', 'a', 'b']);
    failSave(new Error('Storage unavailable'));
    await harness.fixture.whenStable();
    expect(ids()).toEqual(['a', 'b', 'c']);
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('order could not be saved');
  });

  it('cancels drags and ignores external drops without changing folder membership', async () => {
    const saved = TestBed.inject(SavedCvs);
    await saved.save(cvInfo, null);
    await saved.createFolder('Applications');
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    const source = harness.routeNativeElement!.querySelector('a.cv-card')!;
    startDrag(source);
    document.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 }));
    releaseOn(harness.routeNativeElement!.querySelector('.saved-folder')!);
    await harness.fixture.whenStable();
    expect(saved.folders()[0].cvIds).toEqual([]);
    expect(harness.routeNativeElement!.querySelector('a.cv-card')).not.toBeNull();
  });

  it('keeps a CV in the main list and reports a failed move', async () => {
    const saved = TestBed.inject(SavedCvs);
    await saved.save(cvInfo, null);
    await saved.createFolder('Applications');
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    spyOn(IDBObjectStore.prototype, 'put').and.throwError('Storage unavailable');
    startDrag(harness.routeNativeElement!.querySelector('a.cv-card')!);
    await harness.fixture.whenStable();
    releaseOn(harness.routeNativeElement!.querySelector('.saved-folder')!);
    await harness.fixture.whenStable();
    expect(saved.folders()[0].cvIds).toEqual([]);
    expect(harness.routeNativeElement!.querySelector('a.cv-card')).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector('[role="alert"]')?.textContent).toContain('could not be moved');
  });

  it('deletes a CV from its folder without navigating and updates the count', async () => {
    const saved = TestBed.inject(SavedCvs);
    const id = await saved.save(cvInfo, null);
    const folder = await saved.createFolder('Applications');
    await saved.moveCv(id, folder.id);
    TestBed.inject(CvDraft).savedId.set(id);
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-card')!.click();
    await harness.fixture.whenStable();
    document.querySelector<HTMLButtonElement>('#folder-dialog .delete-cv')!.click();
    await harness.fixture.whenStable();
    document.querySelector<HTMLButtonElement>('#delete-confirmation .confirm-delete button')!.click();
    await harness.fixture.whenStable();
    expect(saved.folders()[0].cvIds).toEqual([]);
    expect(await saved.load(id)).toBeNull();
    expect(document.querySelector('#folder-dialog')?.textContent).toContain('This folder is empty');
    expect(TestBed.inject(CvDraft).savedId()).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/');
  });

  for (const view of ['card', 'list']) {
    it(`previews and downloads a folder CV in ${view} view while preserving the folder dialog`, async () => {
      const saved = TestBed.inject(SavedCvs);
      const id = await saved.save(cvInfo, null);
      const folder = await saved.createFolder('Applications');
      await saved.moveCv(id, folder.id);
      const download = spyOn(TestBed.inject(CvPdf), 'download').and.resolveTo();
      const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
      if (view === 'card') {
        harness.routeNativeElement!.querySelector<HTMLButtonElement>('.view-toggle')!.click();
        await harness.fixture.whenStable();
      }
      harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-card')!.click();
      await harness.fixture.whenStable();
      const folderDialog = document.querySelector<HTMLDialogElement>('#folder-dialog')!;
      const button = folderDialog.querySelector<HTMLButtonElement>('.preview-cv')!;
      button.focus();
      button.click();
      for (const block of await harness.fixture.getDeferBlocks()) {
        await block.render(DeferBlockState.Complete);
      }
      await harness.fixture.whenStable();
      const preview = document.getElementById('cv-preview-' + id)!;
      expect(preview.querySelector('.cv-info h2')?.textContent).toBe('Ada');
      expect(folderDialog.parentElement!.inert).toBeTrue();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await harness.fixture.whenStable();
      expect(document.getElementById('cv-preview-' + id)).toBeNull();
      expect(folderDialog.open).toBeTrue();
      expect(folderDialog.parentElement!.inert).toBeFalse();
      expect(document.activeElement).toBe(button);
      folderDialog.querySelector<HTMLButtonElement>('.download-cv')!.click();
      expect(download).toHaveBeenCalledOnceWith(saved.all()[0].info);
      expect(saved.folders()[0].cvIds).toEqual([id]);
      expect(TestBed.inject(Router).url).toBe('/');
    });
  }

  for (const view of ['card', 'list']) {
    for (const location of ['main collection', 'folder']) {
      it(`edits the previewed ${view} CV from the ${location} and clears its overlays`, async () => {
        const saved = TestBed.inject(SavedCvs);
        await saved.save(cvInfo, null);
        const id = await saved.save({ ...cvInfo, name: 'Grace' }, null);
        if (location === 'folder') {
          const folder = await saved.createFolder('Applications');
          await saved.moveCv(id, folder.id);
        }
        const draft = TestBed.inject(CvDraft);
        draft.save({ ...cvInfo, name: 'Stale editor draft' });
        draft.savedId.set(id);
        const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
        if (view === 'card') {
          harness.routeNativeElement!.querySelector<HTMLButtonElement>('.view-toggle')!.click();
          await harness.fixture.whenStable();
        }
        if (location === 'folder') {
          harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-card')!.click();
          await harness.fixture.whenStable();
        }
        document.querySelector<HTMLButtonElement>(`[data-cv-id="${id}"] .preview-cv`)!.click();
        for (const block of await harness.fixture.getDeferBlocks()) {
          await block.render(DeferBlockState.Complete);
        }
        await harness.fixture.whenStable();
        const preview = document.getElementById('cv-preview-' + id)!;
        expect(preview.querySelector('.cv-info h2')?.textContent).toBe('Grace');
        expect(draft.current()?.name).toBe('Stale editor draft');
        preview.querySelector<HTMLAnchorElement>('header .edit-cv')!.click();
        await harness.fixture.whenStable();
        expect(TestBed.inject(Router).url).toBe('/create?id=' + id);
        expect((harness.routeDebugElement!.componentInstance as Create).form.controls.name.value).toBe('Grace');
        expect(draft.savedId()).toBe(id);
        expect(draft.hasUnsavedChanges()).toBeFalse();
        expect(document.querySelector('.dialog-overlay')).toBeNull();
        expect(document.querySelector('[inert]')).toBeNull();
      });
    }
  }

  it('keeps a CV in its folder when a move out fails', async () => {
    const saved = TestBed.inject(SavedCvs);
    const id = await saved.save(cvInfo, null);
    const folder = await saved.createFolder('Applications');
    await saved.moveCv(id, folder.id);
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-card')!.click();
    await harness.fixture.whenStable();
    spyOn(IDBObjectStore.prototype, 'put').and.throwError('Membership write failed');
    startDrag(document.querySelector('#folder-dialog a.cv-card')!);
    await harness.fixture.whenStable();
    onBackdrop('pointerup');
    await harness.fixture.whenStable();
    expect(saved.folders()[0].cvIds).toEqual([id]);
    expect(harness.routeNativeElement!.querySelector('a.cv-card')).toBeNull();
    expect(document.querySelector('#folder-dialog a.cv-card')).not.toBeNull();
    expect(document.querySelector('#folder-dialog [role="alert"]')?.textContent).toContain('could not be moved');
  });

  it('keeps a minimum folder-dialog height and cancels Escape dragging without closing the folder', async () => {
    const saved = TestBed.inject(SavedCvs);
    const id = await saved.save(cvInfo, null);
    const folder = await saved.createFolder('Applications');
    await saved.moveCv(id, folder.id);
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-card')!.click();
    await harness.fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('#folder-dialog')!;
    const minHeight = Math.min(32 * parseFloat(getComputedStyle(document.documentElement).fontSize), innerHeight - 32);
    expect(parseFloat(getComputedStyle(dialog).minHeight)).toBeCloseTo(minHeight, 0);
    startDrag(dialog.querySelector('a.cv-card')!);
    await harness.fixture.whenStable();
    expect(dialog.getBoundingClientRect().height).toBeGreaterThanOrEqual(minHeight);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    expect(dialog.open).toBeTrue();
    expect(getComputedStyle(dialog.querySelector('app-draggable')!).display).not.toBe('none');
    expect(saved.folders()[0].cvIds).toEqual([id]);
    expect(document.querySelector('.app-drag-preview')).toBeNull();
    await saved.moveCv(id, null);
    await harness.fixture.whenStable();
    expect(dialog.getBoundingClientRect().height).toBeGreaterThanOrEqual(minHeight);
  });

  for (const view of ['card', 'list']) {
    for (const direction of ['into', 'out of']) {
      it(`keeps the ${view} layout stable while a move ${direction} a folder is saving`, async () => {
        const saved = TestBed.inject(SavedCvs);
        const id = await saved.save(cvInfo, null);
        const folder = await saved.createFolder('Applications');
        if (direction === 'out of') await saved.moveCv(id, folder.id);
        const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
        const root = harness.routeNativeElement!;
        if (view === 'card') {
          root.querySelector<HTMLButtonElement>('.view-toggle')!.click();
          await harness.fixture.whenStable();
        }
        if (direction === 'out of') {
          root.querySelector<HTMLButtonElement>('.folder-card')!.click();
          await harness.fixture.whenStable();
        }
        const originalRefresh = saved.refresh.bind(saved);
        let finishRefresh!: () => void;
        let enteredRefresh!: () => void;
        const gate = new Promise<void>((resolve) => { finishRefresh = resolve; });
        const entered = new Promise<void>((resolve) => { enteredRefresh = resolve; });
        spyOn(saved, 'refresh').and.callFake(async () => {
          saved.loading.set(true);
          enteredRefresh();
          await gate;
          await originalRefresh();
        });
        const dialog = document.querySelector<HTMLDialogElement>('#folder-dialog');
        const source = direction === 'into' ? root.querySelector('a.cv-card')! : dialog!.querySelector('a.cv-card')!;
        startDrag(source);
        await harness.fixture.whenStable();
        const target = root.querySelector('.saved-folder')!;
        if (direction === 'into') {
          overTarget(target);
          await harness.fixture.whenStable();
        }
        const heldHeight = (dialog ?? target).getBoundingClientRect().height;
        const title = root.querySelector('#home-title')!;
        const folderTop = target.getBoundingClientRect().top - title.getBoundingClientRect().top;
        if (direction === 'into') releaseOn(target);
        else onBackdrop('pointerup');
        harness.fixture.detectChanges();
        expect(root.querySelector('a.cv-card')).toBeNull();
        expect(dialog?.querySelector('a.cv-card') ?? null).toBeNull();
        expect(document.querySelector('.app-drag-preview')).toBeNull();
        expect((dialog ?? target).getBoundingClientRect().height).toBeCloseTo(heldHeight, 0);
        await entered;
        harness.fixture.detectChanges();
        expect(saved.loading()).toBeTrue();
        expect(root.querySelector('.saved-cvs > [role="status"]')).toBeNull();
        expect(root.querySelector('a.cv-card')).toBeNull();
        expect(dialog?.querySelector('a.cv-card') ?? null).toBeNull();
        expect(target.getBoundingClientRect().top - title.getBoundingClientRect().top).toBeCloseTo(folderTop, 0);
        expect((dialog ?? target).getBoundingClientRect().height).toBeCloseTo(heldHeight, 0);
        finishRefresh();
        await harness.fixture.whenStable();
        expect(saved.folders()[0].cvIds).toEqual(direction === 'into' ? [id] : []);
        expect(root.querySelector('a.cv-card') !== null).toBe(direction === 'out of');
        expect(dialog?.querySelector('a.cv-card') ?? null).toBeNull();
      });
    }
  }

  it('restores a folder CV only after a delayed move fails', async () => {
    const saved = TestBed.inject(SavedCvs);
    const id = await saved.save(cvInfo, null);
    const folder = await saved.createFolder('Applications');
    await saved.moveCv(id, folder.id);
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.folder-card')!.click();
    await harness.fixture.whenStable();
    let rejectMove!: (error: Error) => void;
    spyOn(saved, 'moveCv').and.returnValue(new Promise<void>((_, reject) => { rejectMove = reject; }));
    const dialog = document.querySelector<HTMLDialogElement>('#folder-dialog')!;
    startDrag(dialog.querySelector('a.cv-card')!);
    await harness.fixture.whenStable();
    onBackdrop('pointerup');
    harness.fixture.detectChanges();
    expect(dialog.querySelector('a.cv-card')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('a.cv-card')).toBeNull();
    rejectMove(new Error('Storage unavailable'));
    await harness.fixture.whenStable();
    expect(dialog.querySelector('a.cv-card')).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector('a.cv-card')).toBeNull();
    expect(saved.folders()[0].cvIds).toEqual([id]);
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('could not be moved');
  });
});
