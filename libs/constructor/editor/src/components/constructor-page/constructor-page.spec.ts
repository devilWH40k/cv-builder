import { ToastService } from 'angular-shared-ui/toast';
import { DeleteConfirmationService } from 'angular-shared-ui/delete-confirmation';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ConstructorPageComponent } from './constructor-page';
import { ConstructorRepository } from 'constructor/core';
import { blankDesign } from 'constructor/canvas';
import { ConstructorEditor } from '../../services/constructor-editor';
import { ConstructorSession } from '../../services/constructor-session';
import { Canvas, FabricObject } from 'fabric';
import { ConstructorTour, CONSTRUCTOR_TOUR_KEY } from '../../services/constructor-tour';

describe('Fullscreen constructor page', () => {
  beforeEach(() => {
    const getItem = Storage.prototype.getItem;
    spyOn(Storage.prototype, 'getItem').and.callFake(function (this: Storage, key: string) {
      return key === CONSTRUCTOR_TOUR_KEY ? 'done' : getItem.call(this, key);
    });
  });

  it('opens centered shortcuts from Help and replays the tour without losing the active page or history', async () => {
    const design = blankDesign();
    const repository = jasmine.createSpyObj<ConstructorRepository>('repository', ['load', 'recentlyVisited', 'recordVisit']);
    repository.load.and.resolveTo(design);
    repository.recentlyVisited.and.resolveTo([]);
    repository.recordVisit.and.resolveTo();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
      provideRouter([{ path: 'constructor', component: ConstructorPageComponent }]),
      { provide: ConstructorRepository, useValue: repository }],
    });
    const harness = await RouterTestingHarness.create('/constructor?design=' + design.id);
    await harness.fixture.whenStable();
    const editorDialog = document.querySelector<HTMLDialogElement>('dialog.editor')!;
    const initialEditor = harness.routeDebugElement!.injector.get(ConstructorEditor);
    initialEditor.addShape('rectangle');
    await harness.fixture.whenStable();
    const openHelp = async () => {
      editorDialog.querySelector<HTMLButtonElement>('ui-dropdown[menuId="constructor-help-menu"] button')!.click();
      await harness.fixture.whenStable();
    };
    const choose = (label: string) => Array.from(editorDialog.querySelectorAll<HTMLButtonElement>('#constructor-help-menu [role="menuitem"]'))
      .find((button) => button.textContent?.trim() === label)!.click();
    const headers = Array.from(editorDialog.querySelectorAll('.file-menu ui-dropdown > button'));
    expect(headers.map((button) => button.textContent?.trim())).toEqual(['File', 'View', 'Help']);
    await openHelp();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const footer = editorDialog.querySelector<HTMLElement>('.editor-footer')!;
    const viewport = editorDialog.querySelector<HTMLElement>('.canvas-viewport')!;
    const footerBefore = footer.getBoundingClientRect();
    const viewportBefore = viewport.getBoundingClientRect();
    const resized = spyOn(Canvas.prototype, 'setDimensions').and.callThrough();
    const repaint = spyOn(Canvas.prototype, 'requestRenderAll').and.callThrough();
    choose('Shortcuts');
    await harness.fixture.whenStable();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    expect(footer.getBoundingClientRect().top).toBe(footerBefore.top);
    expect(footer.getBoundingClientRect().height).toBe(footerBefore.height);
    expect(viewport.getBoundingClientRect().height).toBe(viewportBefore.height);
    expect(resized).not.toHaveBeenCalled();
    expect(repaint).not.toHaveBeenCalled();
    const shortcuts = document.querySelector<HTMLDialogElement>('#constructor-shortcuts')!;
    expect(shortcuts.open).toBeTrue();
    expect(Array.from(shortcuts.querySelectorAll('h3')).map((heading) => heading.textContent)).toEqual([
      'General', 'Text', 'Image', 'Figure', 'Layers and groups', 'Guides',
    ]);
    const bounds = shortcuts.getBoundingClientRect();
    expect(Math.abs(bounds.left + bounds.width / 2 - innerWidth / 2)).toBeLessThan(2);
    const row = shortcuts.querySelector('.shortcut-row')!;
    expect(row.querySelector('dt')!.textContent).toBe('Save design');
    expect(row.querySelector('dd')!.textContent).toContain('Ctrl / Cmd + S');
    expect(row.querySelector('dt')!.getBoundingClientRect().left).toBeLessThan(row.querySelector('dd')!.getBoundingClientRect().left);
    shortcuts.querySelector<HTMLButtonElement>('[aria-label="Close Shortcuts"]')!.click();
    await harness.fixture.whenStable();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    expect(document.querySelector('#constructor-shortcuts')).toBeNull();
    expect(editorDialog.open).toBeTrue();
    expect(footer.getBoundingClientRect().top).toBe(footerBefore.top);
    expect(viewport.getBoundingClientRect().height).toBe(viewportBefore.height);
    expect(resized).not.toHaveBeenCalled();
    expect(repaint).not.toHaveBeenCalled();
    const editor = harness.routeDebugElement!.injector.get(ConstructorEditor);
    const session = harness.routeDebugElement!.injector.get(ConstructorSession);
    await session.addPage();
    editor.addShape('rectangle');
    const scene = editor.snapshot();
    const undo = editor.undoCount();
    await harness.fixture.whenStable();
    await openHelp();
    choose('Start guide tour again');
    await harness.fixture.whenStable();
    const tutorial = document.querySelector<HTMLDialogElement>('dialog.joyride')!;
    expect(tutorial.open).toBeTrue();
    expect(harness.routeDebugElement!.injector.get(ConstructorTour).hasUnsavedOriginal()).toBeTrue();
    tutorial.querySelector<HTMLButtonElement>('button')!.click();
    await harness.fixture.whenStable();
    expect(session.document()?.id).toBe(design.id);
    expect(session.activePage()).toBe(1);
    expect(session.dirty()).toBeTrue();
    expect(editor.snapshot()).toBe(scene);
    expect(editor.undoCount()).toEqual(undo);
    await editor.undo();
    expect(editor.layers().length).toBe(0);
  });

  it('runs the first-visit tutorial over the editor and restores the saved design on skip', async () => {
    (Storage.prototype.getItem as jasmine.Spy).and.returnValue(null);
    const persist = spyOn(Storage.prototype, 'setItem');
    const design = blankDesign();
    const repository = jasmine.createSpyObj<ConstructorRepository>('repository', [
      'load', 'recentlyVisited', 'recordVisit',
    ]);
    repository.load.and.resolveTo(design);
    repository.recentlyVisited.and.resolveTo([]);
    repository.recordVisit.and.resolveTo();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
      provideRouter([{ path: 'constructor', component: ConstructorPageComponent }]),
      { provide: ConstructorRepository, useValue: repository }],
    });
    const harness = await RouterTestingHarness.create('/constructor?design=' + design.id);
    await harness.fixture.whenStable();
    const tutorial = document.querySelector<HTMLDialogElement>('dialog.joyride')!;
    expect(tutorial).not.toBeNull();
    expect(tutorial.open).toBeTrue();
    const dialog = document.querySelector<HTMLDialogElement>('dialog.editor')!;
    expect(dialog.open).toBeTrue();
    expect(dialog.parentElement!.inert).toBeTrue();
    expect(dialog.querySelector('.document-caption')?.textContent).toContain('Constructor tutorial');
    const next = () => Array.from(tutorial.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === 'Next')!.click();
    next();
    await harness.fixture.whenStable();
    next();
    await harness.fixture.whenStable();
    expect(tutorial.textContent).toContain('Rectangle properties');
    const component = harness.routeDebugElement!;
    const editor = component.injector.get(ConstructorEditor);
    expect(editor.selection()?.kind).toBe('rectangle');
    const contextMenuIndex = component.injector.get(ConstructorTour).steps.findIndex((step) => step.previewContextMenu);
    expect(contextMenuIndex).toBeGreaterThan(2);
    for (let index = 3; index <= contextMenuIndex; index++) {
      next();
      await harness.fixture.whenStable();
    }
    const menu = () => document.querySelector<HTMLElement>('.context-menu');
    expect(menu()).not.toBeNull();
    expect(menu()!.inert).toBeTrue();
    expect(menu()!.textContent).toContain('Bring to front');
    expect(editor.selection()?.kind).toBe('rectangle');
    const objectBounds = editor.selectionClientBounds()!;
    const menuBounds = menu()!.getBoundingClientRect();
    const anchorX = objectBounds.left + objectBounds.width / 2;
    expect(menuBounds.left).toBeCloseTo(Math.max(0, Math.min(anchorX,
      document.documentElement.clientWidth - menuBounds.width)), 0);
    const spotlight = tutorial.querySelector<HTMLElement>('.spotlight')!;
    expect(parseFloat(spotlight.style.left)).toBeCloseTo(Math.max(8, menuBounds.left - 4), 0);
    expect(parseFloat(spotlight.style.width)).toBeCloseTo(menuBounds.width + 8, 0);
    expect(tutorial.contains(document.activeElement)).toBeTrue();
    next();
    await harness.fixture.whenStable();
    expect(menu()).toBeNull();
    Array.from(tutorial.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === 'Prev')!.click();
    await harness.fixture.whenStable();
    expect(menu()).not.toBeNull();
    tutorial.querySelector<HTMLButtonElement>('button')!.click();
    await harness.fixture.whenStable();
    expect(document.querySelector('dialog.joyride')).toBeNull();
    expect(menu()).toBeNull();
    expect(dialog.parentElement!.inert).toBeFalse();
    expect(dialog.querySelector('.document-caption')?.textContent).toContain(design.title);
    expect(dialog.querySelector('.file-status')?.textContent).toContain('Saved');
    expect(editor.layers().length).toBe(0);
    expect(persist).toHaveBeenCalledWith(CONSTRUCTOR_TOUR_KEY, 'done');
  });

  it('waits on the library page and starts the tour when the user creates a blank design', async () => {
    (Storage.prototype.getItem as jasmine.Spy).and.returnValue(null);
    spyOn(Storage.prototype, 'setItem');
    const repository = jasmine.createSpyObj<ConstructorRepository>('repository', ['recentlyVisited']);
    repository.recentlyVisited.and.resolveTo([]);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
      provideRouter([{ path: 'constructor', component: ConstructorPageComponent }]),
      { provide: ConstructorRepository, useValue: repository }],
    });
    const harness = await RouterTestingHarness.create('/constructor');
    await harness.fixture.whenStable();
    expect(document.querySelector('dialog.joyride')).toBeNull();
    expect(document.querySelector<HTMLDialogElement>('dialog.editor')?.open).toBeFalse();
    const blank = Array.from(harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Blank design'))!;
    blank.click();
    await harness.fixture.whenStable();
    const tutorial = document.querySelector<HTMLDialogElement>('dialog.joyride')!;
    expect(tutorial.open).toBeTrue();
    tutorial.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    expect(document.querySelector('dialog.joyride')).toBeNull();
    expect(document.querySelector<HTMLDialogElement>('dialog.editor')?.open).toBeTrue();
    expect(document.querySelector('.document-caption')?.textContent).toContain('Untitled design');
    expect(document.querySelector('.file-status')?.textContent).toContain('Unsaved changes');
  });
  it('shows file-style page actions above the canvas and uses a compact document header', async () => {
    const design = blankDesign();
    const repository = jasmine.createSpyObj<ConstructorRepository>('repository', [
      'load', 'recentlyVisited', 'recordVisit',
    ]);
    repository.load.and.resolveTo(design);
    repository.recentlyVisited.and.resolveTo([]);
    repository.recordVisit.and.resolveTo();
    const confirmation = jasmine.createSpyObj<DeleteConfirmationService>('confirmation', ['confirm']);
    confirmation.confirm.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(),
        provideRouter([{ path: 'constructor', component: ConstructorPageComponent }]),
        { provide: ConstructorRepository, useValue: repository },
        { provide: DeleteConfirmationService, useValue: confirmation }],
    });
    const harness = await RouterTestingHarness.create('/constructor?design=' + design.id);
    await harness.fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('dialog.editor')!;
    const pages = dialog.querySelector<HTMLElement>('.pages-section')!;
    expect(pages.parentElement?.classList.contains('stage-column')).toBeTrue();
    expect(pages.nextElementSibling?.classList.contains('canvas-area')).toBeTrue();
    expect(dialog.querySelector('.stage-column .hint')).toBeNull();
    expect(pages.closest('.page-properties-panel')).toBeNull();
    const library = dialog.querySelector('lib-constructor-icon-library')!;
    expect(library.closest('.page-properties-panel')).toBeNull();
    const divider = dialog.querySelector<HTMLElement>('[aria-label="Resize page properties and icon library height"]')!;
    expect(divider.getAttribute('aria-orientation')).toBe('horizontal');
    expect(library.closest('.icon-library-panel')?.previousElementSibling).toBe(divider.parentElement);
    expect(divider.parentElement?.previousElementSibling).toBe(dialog.querySelector('.page-properties-panel'));
    divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await harness.fixture.whenStable();
    expect(divider.getAttribute('aria-valuenow')).toBe('410');
    expect((dialog.querySelector('.page-panels') as HTMLElement).style.getPropertyValue('--page-properties-height')).toBe('410px');
    expect(pages.getAttribute('aria-label')).toBe('Design pages');
    expect(dialog.querySelector('.stage-column .page-tabs')).toBe(pages);
    const heading = dialog.querySelector('.document-heading')!;
    const fileProperties = dialog.querySelector('.file-properties')!;
    expect(fileProperties.nextElementSibling?.tagName.toLowerCase()).toBe('lib-constructor-page-properties');
    const fileName = fileProperties.querySelector<HTMLInputElement>('[aria-label="File name"]')!;
    const status = fileProperties.querySelector('.file-status')!;
    expect(status.textContent).toContain('Status: Saved');
    expect(status.getBoundingClientRect().bottom).toBeLessThanOrEqual(fileName.getBoundingClientRect().top);
    expect(heading.getBoundingClientRect().height).toBeLessThanOrEqual(20);
    heading.querySelectorAll('button').forEach((button) => {
      const style = getComputedStyle(button);
      expect(button.getBoundingClientRect().height).withContext(JSON.stringify({
        text: button.textContent?.trim(), boxSizing: style.boxSizing, minHeight: style.minHeight,
        lineHeight: style.lineHeight, padding: style.padding, border: style.borderWidth,
      })).toBeLessThanOrEqual(32);
    });
    const titleBounds = heading.querySelector('.document-caption')!.getBoundingClientRect();
    const headerBounds = heading.getBoundingClientRect();
    expect(Math.abs(titleBounds.left + titleBounds.width / 2 - headerBounds.left - headerBounds.width / 2)).toBeLessThan(1);
    const fileTrigger = heading.querySelector<HTMLButtonElement>('ui-dropdown > button')!;
    fileTrigger.closest('ui-dropdown')!.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await harness.fixture.whenStable();
    expect(fileTrigger.getAttribute('aria-expanded')).toBe('true');
    const items = Array.from(dialog.querySelectorAll('#constructor-file-menu [role="menuitem"]'));
    expect(items.map((item) => item.querySelector('span')!.textContent?.trim())).toEqual([
      'New Design', 'Open From CV', 'Save', 'Import Design File', 'Export PDF', 'Export Design File'
    ]);
    expect(items.map((item) => item.querySelector('.shortcut')?.textContent?.trim() ?? '')).toEqual([
      '', '', 'Ctrl+S', 'Ctrl+I', 'Ctrl+E', 'Ctrl+Shift+E'
    ]);
    fileTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await harness.fixture.whenStable();
    const input = document.querySelector<HTMLInputElement>('input[accept="application/json,.json"]')!;
    const openFile = spyOn(input, 'click');
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', ctrlKey: true, bubbles: true, cancelable: true }));
    expect(openFile).toHaveBeenCalledOnceWith();
    expect(input.closest('dialog')).toBe(dialog);
    const beforeCancelTitle = dialog.querySelector('.document-caption')!.textContent;
    input.dispatchEvent(new Event('cancel', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(dialog.open).toBeTrue();
    expect(dialog.querySelector('.document-caption')!.textContent).toBe(beforeCancelTitle);
    expect(document.querySelector('#leave-constructor')).toBeNull();
    const download = spyOn(HTMLAnchorElement.prototype, 'click');
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
    expect(download).toHaveBeenCalledTimes(1);
    const windowsMenu = dialog.querySelector('#constructor-view-menu')!;
    const viewTrigger = windowsMenu.closest('ui-dropdown')!.querySelector<HTMLButtonElement>('.trigger')!;
    viewTrigger.click();
    await harness.fixture.whenStable();
    const windowEntries = Array.from(windowsMenu.querySelectorAll<HTMLButtonElement>('[role="menuitemcheckbox"]'));
    expect(windowEntries.map((entry) => entry.querySelector('span')!.textContent?.trim())).toEqual([
      'Main properties', 'Icon library', 'Properties', 'Layers'
    ]);
    expect(windowEntries.every((entry) => entry.getAttribute('aria-checked') === 'true')).toBeTrue();
    const toggleWindow = async (index: number) => {
      windowEntries[index].click();
      await harness.fixture.whenStable();
      expect(viewTrigger.getAttribute('aria-expanded')).toBe('true');
    };
    const leftPanels = dialog.querySelector<HTMLElement>('.page-panels')!;
    const rightPanels = dialog.querySelector<HTMLElement>('.object-panels')!;
    const mainPanel = dialog.querySelector<HTMLElement>('.page-properties-panel')!;
    await toggleWindow(1);
    expect(dialog.querySelector<HTMLElement>('.icon-library-panel')!.hidden).toBeTrue();
    expect(windowEntries[1].getAttribute('aria-checked')).toBe('false');
    expect(windowEntries[1].querySelector('lucide-icon')).toBeNull();
    expect(mainPanel.getBoundingClientRect().height).toBeCloseTo(leftPanels.getBoundingClientRect().height, 0);
    await toggleWindow(0);
    expect(leftPanels.hidden).toBeTrue();
    expect(dialog.querySelector('.workspace')!.classList.contains('no-left-panels')).toBeTrue();
    await toggleWindow(1);
    expect(leftPanels.hidden).toBeFalse();
    expect(dialog.querySelector<HTMLElement>('.icon-library-panel')!.getBoundingClientRect().height).toBeCloseTo(leftPanels.getBoundingClientRect().height, 0);
    await toggleWindow(0);
    await toggleWindow(3);
    expect(dialog.querySelector<HTMLElement>('.properties-panel')!.getBoundingClientRect().height).toBeCloseTo(rightPanels.getBoundingClientRect().height, 0);
    await toggleWindow(2);
    expect(rightPanels.hidden).toBeTrue();
    await toggleWindow(3);
    expect(dialog.querySelector<HTMLElement>('.layers-panel')!.getBoundingClientRect().height).toBeCloseTo(rightPanels.getBoundingClientRect().height, 0);
    await toggleWindow(2);
    expect(windowEntries.every((entry) => entry.getAttribute('aria-checked') === 'true')).toBeTrue();
    viewTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await harness.fixture.whenStable();
    expect(viewTrigger.getAttribute('aria-expanded')).toBe('false');
    const rail = dialog.querySelector('.canvas-tools')!;
    expect(rail.getAttribute('aria-orientation')).toBe('vertical');
    expect(rail.querySelectorAll(':scope > button').length).toBe(5);
    const shapes = rail.querySelector<HTMLButtonElement>('[aria-label="Add shape"]')!;
    shapes.closest('ui-dropdown')!.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await harness.fixture.whenStable();
    expect(shapes.getAttribute('aria-expanded')).toBe('true');
    const star = rail.querySelector<HTMLButtonElement>('#constructor-shapes-menu button:last-child')!;
    expect(star.getAttribute('aria-label')).toBe('Star');
    expect(star.querySelector('lucide-icon')).not.toBeNull();
    star.click();
    await harness.fixture.whenStable();
    expect(shapes.getAttribute('aria-expanded')).toBe('false');
    expect(rail.querySelector('[aria-label="Add text"]')).not.toBeNull();
    expect(dialog.querySelector('.main-toolbar [aria-label="Add text"]')).toBeNull();
    expect(dialog.querySelector('.main-toolbar .history-tools [aria-label="Undo"]')).not.toBeNull();
    expect(dialog.querySelector('.main-toolbar .typography-tools lib-constructor-typography')).not.toBeNull();
    expect(dialog.querySelector('.zoom-label lucide-icon')).not.toBeNull();
    const add = pages.querySelector<HTMLButtonElement>('[aria-label="Add page"]')!;
    expect(add.parentElement).toBe(pages);
    expect(pages.lastElementChild).toBe(add);
    const remove = pages.querySelector<HTMLButtonElement>('[aria-label="Delete Page 1"]')!;
    expect(remove.disabled).toBeTrue();
    const tabBounds = pages.querySelector('.page-select')!.getBoundingClientRect();
    const crossBounds = remove.querySelector('svg')!.getBoundingClientRect();
    expect(Math.abs(tabBounds.top + tabBounds.height / 2 - crossBounds.top - crossBounds.height / 2)).toBeLessThan(1);
    add.click();
    await harness.fixture.whenStable();
    expect(pages.querySelector('[aria-current="page"]')!.textContent).toContain('Page 2');
    expect(remove.disabled).toBeFalse();
    expect(pages.querySelectorAll('.page-delete').length).toBe(2);
    confirmation.confirm.and.resolveTo(false);
    remove.click();
    await harness.fixture.whenStable();
    expect(confirmation.confirm).toHaveBeenCalledWith(jasmine.objectContaining({ itemName: 'Page 1' }), jasmine.anything());
    expect(pages.querySelectorAll('.page-select').length).toBe(2);
    expect(pages.querySelector('[aria-current="page"]')!.textContent).toContain('Page 2');
    confirmation.confirm.and.resolveTo(true);
    remove.click();
    await harness.fixture.whenStable();
    expect(pages.querySelector('[aria-current="page"]')!.textContent).toContain('Page 1');
    expect(pages.querySelector<HTMLButtonElement>('.page-delete')!.disabled).toBeTrue();
  });

  it('shows and edits shared group properties with mixed values', async () => {
    const design = blankDesign();
    const repository = jasmine.createSpyObj<ConstructorRepository>('repository', [
      'load', 'recentlyVisited', 'recordVisit',
    ]);
    repository.load.and.resolveTo(design);
    repository.recentlyVisited.and.resolveTo([]);
    repository.recordVisit.and.resolveTo();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(),
        provideRouter([{ path: 'constructor', component: ConstructorPageComponent }]),
        { provide: ConstructorRepository, useValue: repository }],
    });
    const harness = await RouterTestingHarness.create('/constructor?design=' + design.id);
    await harness.fixture.whenStable();
    const editor = harness.routeDebugElement!.injector.get(ConstructorEditor);
    editor.addText();
    editor.updateText({ fontSize: 18 });
    editor.addText();
    editor.updateText({ fontSize: 32, bold: true });
    editor.selectAll();
    editor.group();
    harness.fixture.detectChanges();
    const properties = document.querySelector('lib-constructor-typography')!;
    const fontLabel = Array.from(properties.querySelectorAll('label')).find((label) =>
      label.textContent?.trim().startsWith('Font size'))!;
    const fontSize = fontLabel.querySelector('input')!;
    expect(fontSize.value).toBe('');
    expect(fontSize.placeholder).toBe('Mixed');
    const bold = properties.querySelector<HTMLButtonElement>('[aria-label="Bold"]')!;
    expect(bold.getAttribute('aria-pressed')).toBe('mixed');
    fontSize.value = '26';
    fontSize.dispatchEvent(new Event('change', { bubbles: true }));
    bold.click();
    harness.fixture.detectChanges();
    expect(fontSize.type).toBe('text');
    expect(fontSize.value).toBe('26');
    fontSize.value = 'invalid';
    fontSize.dispatchEvent(new Event('change', { bubbles: true }));
    expect(fontSize.value).toBe('26');
    expect(bold.getAttribute('aria-pressed')).toBe('true');
    expect(editor.layers()[0].children!.every((child) => child.fontSize === 26 && child.bold)).toBeTrue();
    expect(editor.selectionCount()).toBe(1);
  });

  it('groups with the keyboard, expands member layers and ungroups with Shift', async () => {
    const design = blankDesign();
    const repository = jasmine.createSpyObj<ConstructorRepository>('repository', [
      'load', 'recentlyVisited', 'recordVisit',
    ]);
    repository.load.and.resolveTo(design);
    repository.recentlyVisited.and.resolveTo([]);
    repository.recordVisit.and.resolveTo();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(),
        provideRouter([{ path: 'constructor', component: ConstructorPageComponent }]),
        { provide: ConstructorRepository, useValue: repository }],
    });
    const harness = await RouterTestingHarness.create('/constructor?design=' + design.id);
    await harness.fixture.whenStable();
    const editor = harness.routeDebugElement!.injector.get(ConstructorEditor);
    editor.addText();
    editor.addShape('rectangle');
    editor.selectAll();
    const dialog = document.querySelector<HTMLDialogElement>('dialog.editor')!;
    const canvas = dialog.querySelector<HTMLCanvasElement>('.upper-canvas')!;
    const shortcut = (shiftKey: boolean) => canvas.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'g', code: 'KeyG', ctrlKey: true, shiftKey, bubbles: true, cancelable: true,
    }));
    shortcut(false);
    harness.fixture.detectChanges();
    expect(editor.layers().length).toBe(1);
    const layers = dialog.querySelector('lib-constructor-layers')!;
    expect(layers.querySelectorAll('.layer').length).toBe(1);
    const expand = layers.querySelector<HTMLButtonElement>('.expand')!;
    expect(layers.querySelector('.layer')!.textContent).toContain('Group 1');
    const layerBounds = layers.querySelector('.layer')!.getBoundingClientRect();
    const expandBounds = expand.getBoundingClientRect();
    expect(expandBounds.left).toBeGreaterThanOrEqual(layerBounds.left);
    expect(expandBounds.right).toBeLessThanOrEqual(layerBounds.right);
    expand.click();
    harness.fixture.detectChanges();
    expect(expand.getAttribute('aria-expanded')).toBe('true');
    expect(layers.querySelectorAll('.layer').length).toBe(3);
    expect(layers.querySelectorAll<HTMLElement>('.layer-row')[1].style.paddingLeft).toBe('1rem');
    const children = editor.layers()[0].children!;
    layers.querySelectorAll<HTMLButtonElement>('.layer')[1].click();
    expect(editor.selection()?.id).toBe(children[0].id);
    editor.select(editor.layers()[0].id);
    shortcut(true);
    harness.fixture.detectChanges();
    expect(editor.layers().length).toBe(2);
    expect(layers.querySelector('.expand')).toBeNull();
  });

  for (const shortcut of [
    { key: 'c', action: 'copy', count: 2 },
    { key: 'x', action: 'cut', count: 0 },
    { key: 'v', action: 'paste', count: 4 },
    { key: 'd', action: 'duplicate', count: 4 },
  ]) {
    it(`keeps the workspace visible and focused during slow multi-object ${shortcut.action}`, async () => {
      const design = blankDesign();
      const repository = jasmine.createSpyObj<ConstructorRepository>('repository', [
        'load', 'recentlyVisited', 'recordVisit',
      ]);
      repository.load.and.resolveTo(design);
      repository.recentlyVisited.and.resolveTo([]);
      repository.recordVisit.and.resolveTo();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          provideRouter([{ path: 'constructor', component: ConstructorPageComponent }]),
          { provide: ConstructorRepository, useValue: repository },
        ],
      });
      const harness = await RouterTestingHarness.create('/constructor?design=' + design.id);
      await harness.fixture.whenStable();
      const editor = harness.routeDebugElement!.injector.get(ConstructorEditor);
      editor.addText();
      editor.addShape('rectangle');
      editor.selectAll();
      if (shortcut.key === 'v') await editor.copy();
      await harness.fixture.whenStable();
      const load = spyOn(editor, 'load').and.callThrough();
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => { release = resolve; });
      const clone = FabricObject.prototype.clone;
      spyOn(FabricObject.prototype, 'clone').and.callFake(function (this: FabricObject, properties) {
        return gate.then(() => clone.call(this, properties));
      });
      const dialog = document.querySelector<HTMLDialogElement>('dialog.editor')!;
      const canvas = dialog.querySelector<HTMLCanvasElement>('.upper-canvas')!;
      canvas.focus();
      canvas.dispatchEvent(new KeyboardEvent('keydown', {
        key: shortcut.key, code: 'Key' + shortcut.key.toUpperCase(), ctrlKey: true, bubbles: true,
      }));
      harness.fixture.detectChanges();
      expect(editor.busy()).toBeTrue();
      expect(dialog.classList.contains('operation-busy')).toBeTrue();
      expect(dialog.querySelector('ui-spinner')).toBeNull();
      expect(dialog.querySelector('.is-loading')).toBeNull();
      expect(getComputedStyle(canvas).visibility).toBe('visible');
      expect(document.activeElement).toBe(canvas);
      expect(editor.layers().length).toBe(2);
      release();
      await harness.fixture.whenStable();
      expect(editor.layers().length).toBe(shortcut.count);
      expect(editor.busy()).toBeFalse();
      expect(dialog.classList.contains('operation-busy')).toBeFalse();
      expect(dialog.querySelector('ui-spinner')).toBeNull();
      expect(load).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(canvas);
    });
  }

  it('opens a saved design across the viewport, records its visit and closes back to Recently', async () => {
    const nativeConfirm = spyOn(window, 'confirm').and.returnValue(true);
    const blank = blankDesign();
    const design = { ...blank, title: 'Saved design', pages: [...blank.pages, { ...blank.pages[0], id: crypto.randomUUID() }] };
    const repository = jasmine.createSpyObj<ConstructorRepository>('repository', [
      'load',
      'recentlyVisited',
      'recordVisit',
      'save',
    ]);
    repository.load.and.resolveTo(design);
    repository.recentlyVisited.and.resolveTo([
      { id: design.id, title: design.title, updatedAt: 1, visitedAt: 2 },
    ]);
    repository.recordVisit.and.resolveTo();
    repository.save.and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'constructor', component: ConstructorPageComponent }]),
        { provide: ConstructorRepository, useValue: repository },
      ],
    });
    const harness = await RouterTestingHarness.create('/constructor?design=' + design.id);
    await harness.fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('dialog.editor')!;
    expect(dialog.open).toBeTrue();
    expect(dialog.contains(document.activeElement)).toBeTrue();
    const bounds = dialog.getBoundingClientRect();
    expect(bounds.left).toBe(0);
    expect(bounds.top).toBe(0);
    expect(bounds.width).toBe(innerWidth);
    expect(bounds.height).toBe(innerHeight);
    expect(repository.recordVisit).toHaveBeenCalledOnceWith(design.id);
    expect(dialog.querySelector<HTMLSelectElement>('.zoom-label select')!.value).toBe('fit');
    expect(dialog.querySelector('p[role="status"]:not(.count):not(.file-status), p[role="alert"]')).toBeNull();
    expect(dialog.querySelector('lib-constructor-icon-library .count')?.textContent).toContain('icons');
    const heading = dialog.querySelector('.document-heading')!;
    expect(heading.querySelector('.editor-close')).not.toBeNull();
    const toasts = TestBed.inject(ToastService);
    expect(toasts.messages().length).toBe(0);
    const editor = harness.routeDebugElement!.injector.get(ConstructorEditor);
    const originalLoad = editor.load.bind(editor);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const load = spyOn(editor, 'load').and.callFake(async (page) => {
      await gate;
      await originalLoad(page);
    });
    Array.from(dialog.querySelectorAll<HTMLButtonElement>('.page-tabs button'))
      .find((button) => button.textContent?.trim() === 'Page 2')!.click();
    harness.fixture.detectChanges();
    expect(dialog.querySelectorAll('.is-loading ui-spinner').length).toBe(2);
    expect(dialog.querySelector('.icon-library-panel ui-spinner')).toBeNull();
    expect(dialog.querySelector('.canvas-viewport ui-spinner')).toBeNull();
    expect(dialog.querySelectorAll('[aria-busy="true"]').length).toBe(2);
    expect(toasts.messages().length).toBe(0);
    release();
    await harness.fixture.whenStable();
    expect(dialog.querySelector('ui-spinner')).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    expect(dialog.querySelector('.page-tabs [aria-current="page"]')?.textContent).toContain('Page 2');
    editor.addShape('rectangle');
    const ukrainianUndo = new KeyboardEvent('keydown', { key: 'я', code: 'KeyZ', ctrlKey: true, bubbles: true, cancelable: true });
    dialog.dispatchEvent(ukrainianUndo);
    await harness.fixture.whenStable();
    expect(ukrainianUndo.defaultPrevented).toBeTrue();
    expect(editor.layers().length).toBe(0);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Я', code: 'KeyZ', ctrlKey: true, shiftKey: true, bubbles: true }));
    await harness.fixture.whenStable();
    expect(editor.layers().length).toBe(1);
    editor.select(editor.layers()[0].id);
    await harness.fixture.whenStable();
    const colorInputs = dialog.querySelectorAll<HTMLInputElement>('lib-constructor-properties input[type="color"]');
    const color = colorInputs[colorInputs.length - 1];
    color.value = '#123456';
    color.dispatchEvent(new Event('input', { bubbles: true }));
    color.dispatchEvent(new FocusEvent('blur'));
    await harness.fixture.whenStable();
    expect(editor.selection()?.color).toBe('#123456');
    editor.setTool('draw');
    editor.setTool('select');
    expect(editor.layers()[0].color).toBe('#123456');
    const nativeInputUndo = new KeyboardEvent('keydown', { key: 'я', code: 'KeyZ', ctrlKey: true, bubbles: true, cancelable: true });
    dialog.querySelector<HTMLInputElement>('[aria-label="File name"]')!.dispatchEvent(nativeInputUndo);
    expect(nativeInputUndo.defaultPrevented).toBeFalse();
    const imageCanvas = document.createElement('canvas');
    imageCanvas.width = 400;
    imageCanvas.height = 200;
    imageCanvas.getContext('2d')!.fillRect(0, 0, 400, 200);
    const blob = await new Promise<Blob | null>((resolve) => imageCanvas.toBlob(resolve));
    const image = new File([blob!], 'photo.png', { type: 'image/png' });
    const imageInput = dialog.querySelector<HTMLInputElement>(':scope > input[type="file"][accept^="image/"]')!;
    const upload = () => {
      const transfer = new DataTransfer();
      transfer.items.add(image);
      imageInput.files = transfer.files;
      imageInput.dispatchEvent(new Event('change'));
    };
    const original = editor.snapshot();
    upload();
    await harness.fixture.whenStable();
    const photoDialog = document.querySelector<HTMLDialogElement>('dialog.photo-preview-dialog')!;
    expect(photoDialog.open).toBeTrue();
    expect(photoDialog.querySelectorAll('.shape-options button').length).toBe(3);
    expect(editor.snapshot()).toBe(original);
    photoDialog.querySelector<HTMLButtonElement>('.cancel')!.click();
    await harness.fixture.whenStable();
    expect(editor.snapshot()).toBe(original);
    upload();
    await harness.fixture.whenStable();
    const source = document.querySelector<HTMLImageElement>('.photo-preview-dialog .source-photo')!;
    await source.decode();
    source.dispatchEvent(new Event('load'));
    await harness.fixture.whenStable();
    const insert = spyOn(editor, 'addImage').and.callThrough();
    document.querySelector<HTMLButtonElement>('.photo-preview-dialog ui-button button')!.click();
    await harness.fixture.whenStable();
    expect(insert).toHaveBeenCalledOnceWith(image);
    expect(editor.layers().some((layer) => layer.kind === 'image')).toBeTrue();
    expect(document.querySelector('.photo-preview-dialog')).toBeNull();
    const saveButton = Array.from(dialog.querySelectorAll<HTMLButtonElement>('#constructor-file-menu button'))
      .find((button) => button.querySelector('span')?.textContent?.trim() === 'Save')!;
    saveButton.click();
    await harness.fixture.whenStable();
    expect(toasts.messages().some((message) => message.theme === 'success' && message.message === 'Design saved in this browser.')).toBeTrue();
    repository.save.and.rejectWith(new Error('Save unavailable'));
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    expect(toasts.messages().some((message) => message.theme === 'danger' && message.message === 'Save unavailable')).toBeTrue();
    dialog.querySelector<HTMLButtonElement>('[aria-label="Close editor"]')!.click();
    await harness.fixture.whenStable();
    const leaveButton = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('#leave-constructor button'))
      .find((button) => button.textContent?.trim() === label)!;
    expect(leaveButton('Save and leave')).toBeDefined();
    leaveButton('Cancel').click();
    await harness.fixture.whenStable();
    expect(dialog.open).toBeTrue();
    dialog.querySelector<HTMLButtonElement>('[aria-label="Close editor"]')!.click();
    await harness.fixture.whenStable();
    leaveButton('Save and leave').click();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await harness.fixture.whenStable();
    expect(leaveButton('Leave')).toBeDefined();
    expect(dialog.open).toBeTrue();
    repository.save.and.resolveTo();
    leaveButton('Save and leave').click();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await harness.fixture.whenStable();
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(document.querySelector('.dialog-overlay')).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Recently');
    expect(
      harness.routeNativeElement?.querySelectorAll('.library-actions a, .library-actions button')
        .length,
    ).toBe(3);
  });
});
