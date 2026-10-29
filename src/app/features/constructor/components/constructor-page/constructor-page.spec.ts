import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ConstructorPageComponent } from './constructor-page';
import { ConstructorRepository } from '../../services/constructor-repository';
import { blankDesign } from '../../helpers/preview-to-design';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConstructorEditor } from '../../services/constructor-editor';
import { FabricObject } from 'fabric';
import { DeleteConfirmationService } from '../../../../shared/ui/delete-confirmation/delete-confirmation.service';

describe('Fullscreen constructor page', () => {
  it('keeps page actions below page properties and uses a compact document header', async () => {
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
    const pages = dialog.querySelector('.pages-section')!;
    expect(pages.previousElementSibling?.tagName.toLowerCase()).toBe('app-constructor-page-properties');
    expect(pages.closest('.page-properties-panel')).not.toBeNull();
    const library = dialog.querySelector('app-constructor-icon-library')!;
    expect(library.closest('.page-properties-panel')).toBeNull();
    const divider = dialog.querySelector<HTMLElement>('[aria-label="Resize page properties and icon library height"]')!;
    expect(divider.getAttribute('aria-orientation')).toBe('horizontal');
    expect(library.closest('.icon-library-panel')?.previousElementSibling).toBe(divider.parentElement);
    expect(divider.parentElement?.previousElementSibling).toBe(pages.closest('.page-properties-panel'));
    divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await harness.fixture.whenStable();
    expect(divider.getAttribute('aria-valuenow')).toBe('410');
    expect((dialog.querySelector('.page-panels') as HTMLElement).style.getPropertyValue('--page-properties-height')).toBe('410px');
    expect(pages.querySelector('h2')!.textContent).toBe('Pages');
    expect(dialog.querySelector('.stage-column .page-tabs')).toBeNull();
    const heading = dialog.querySelector('.document-heading')!;
    const title = heading.querySelector('[aria-label="Design name"]')!.getBoundingClientRect();
    const status = heading.querySelector('.save-state')!.getBoundingClientRect();
    expect(status.left).toBeGreaterThanOrEqual(title.right);
    expect(Math.abs((status.top + status.height / 2) - (title.top + title.height / 2))).toBeLessThan(1);
    expect(heading.getBoundingClientRect().height).toBeLessThanOrEqual(40);
    heading.querySelectorAll('button').forEach((button) => {
      const style = getComputedStyle(button);
      expect(button.getBoundingClientRect().height).withContext(JSON.stringify({
        text: button.textContent?.trim(), boxSizing: style.boxSizing, minHeight: style.minHeight,
        lineHeight: style.lineHeight, padding: style.padding, border: style.borderWidth,
      })).toBeLessThanOrEqual(32);
    });
    const add = pages.querySelector<HTMLButtonElement>('[aria-label="Add page"]')!;
    expect(add.closest('.pages-heading')).not.toBeNull();
    const caption = pages.querySelector('h2')!.getBoundingClientRect();
    const addBounds = add.getBoundingClientRect();
    expect(addBounds.left).toBeGreaterThan(caption.right);
    expect(Math.abs((caption.top + caption.height / 2) - (addBounds.top + addBounds.height / 2))).toBeLessThan(1);
    const remove = pages.querySelector<HTMLButtonElement>('[aria-label="Delete Page 1"]')!;
    expect(remove.disabled).toBeTrue();
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
    const properties = document.querySelector('app-constructor-typography')!;
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
    const layers = dialog.querySelector('app-constructor-layers')!;
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
      expect(dialog.querySelector('app-spinner')).toBeNull();
      expect(dialog.querySelector('.is-loading')).toBeNull();
      expect(getComputedStyle(canvas).visibility).toBe('visible');
      expect(document.activeElement).toBe(canvas);
      expect(editor.layers().length).toBe(2);
      release();
      await harness.fixture.whenStable();
      expect(editor.layers().length).toBe(shortcut.count);
      expect(editor.busy()).toBeFalse();
      expect(dialog.classList.contains('operation-busy')).toBeFalse();
      expect(dialog.querySelector('app-spinner')).toBeNull();
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
    expect(dialog.querySelector('p[role="status"]:not(.count), p[role="alert"]')).toBeNull();
    expect(dialog.querySelector('app-constructor-icon-library .count')?.textContent).toContain('icons');
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
    expect(dialog.querySelectorAll('.is-loading app-spinner').length).toBe(5);
    expect(dialog.querySelectorAll('[aria-busy="true"]').length).toBe(5);
    expect(toasts.messages().length).toBe(0);
    release();
    await harness.fixture.whenStable();
    expect(dialog.querySelector('app-spinner')).toBeNull();
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
    const colorInputs = dialog.querySelectorAll<HTMLInputElement>('app-constructor-properties input[type="color"]');
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
    dialog.querySelector<HTMLInputElement>('[aria-label="Design name"]')!.dispatchEvent(nativeInputUndo);
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
    document.querySelector<HTMLButtonElement>('.photo-preview-dialog app-button button')!.click();
    await harness.fixture.whenStable();
    expect(insert).toHaveBeenCalledOnceWith(image);
    expect(editor.layers().some((layer) => layer.kind === 'image')).toBeTrue();
    expect(document.querySelector('.photo-preview-dialog')).toBeNull();
    const saveButton = Array.from(dialog.querySelectorAll<HTMLButtonElement>('.document-actions button'))
      .find((button) => button.textContent?.trim() === 'Save')!;
    saveButton.click();
    await harness.fixture.whenStable();
    expect(toasts.messages().some((message) => message.theme === 'success' && message.message === 'Design saved in this browser.')).toBeTrue();
    repository.save.and.rejectWith(new Error('Save unavailable'));
    saveButton.click();
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
