import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ConstructorPageComponent } from './constructor-page';
import { ConstructorRepository } from '../../services/constructor-repository';
import { blankDesign } from '../../helpers/preview-to-design';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConstructorEditor } from '../../services/constructor-editor';

describe('Fullscreen constructor page', () => {
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
    expect(dialog.querySelector('p[role="status"], p[role="alert"]')).toBeNull();
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
    expect(dialog.querySelectorAll('.is-loading app-spinner').length).toBe(4);
    expect(dialog.querySelectorAll('[aria-busy="true"]').length).toBe(4);
    expect(toasts.messages().length).toBe(0);
    release();
    await harness.fixture.whenStable();
    expect(dialog.querySelector('app-spinner')).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    expect(dialog.querySelector('.page-tabs [aria-current="page"]')?.textContent).toContain('Page 2');
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
