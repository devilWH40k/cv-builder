import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConstructorSession } from './constructor-session';
import { ConstructorRepository } from './constructor-repository';
import { ConstructorEditor } from './constructor-editor';
import { blankDesign } from '../helpers/preview-to-design';
import { loadDesignFonts } from '../helpers/design-assets';
import { ConstructorDocument } from '../interfaces/constructor-document';

describe('Constructor document sessions', () => {
  let session: ConstructorSession;
  let editor: ConstructorEditor;
  let repository: jasmine.SpyObj<ConstructorRepository>;
  let canvas: HTMLCanvasElement;
  beforeEach(async () => {
    repository = jasmine.createSpyObj<ConstructorRepository>('repository', ['save']);
    repository.save.and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ConstructorEditor,
        ConstructorSession,
        { provide: ConstructorRepository, useValue: repository },
      ],
    });
    await loadDesignFonts();
    session = TestBed.inject(ConstructorSession);
    editor = TestBed.inject(ConstructorEditor);
    canvas = document.createElement('canvas');
    document.body.append(canvas);
    editor.attach(canvas, () => session.markChanged());
    await session.open(blankDesign(), true);
  });
  afterEach(async () => {
    await editor.dispose();
    canvas.remove();
  });

  it('keeps independent scenes when switching, adding and removing pages', async () => {
    editor.addText();
    const first = editor.snapshot();
    await session.addPage();
    editor.addShape('circle');
    const second = editor.snapshot();
    await session.switchPage(0);
    expect(editor.snapshot()).toBe(first);
    await session.switchPage(1);
    expect(editor.snapshot()).toBe(second);
    await session.removePage();
    expect(session.document()?.pages.length).toBe(1);
    expect(editor.snapshot()).toBe(first);
    await session.removePage();
    expect(session.document()?.pages.length).toBe(1);
  });

  it('waits for durable saves and retains changes made while a save is pending', async () => {
    let resolveSave!: () => void;
    repository.save.and.returnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
    );
    editor.addText();
    const pending = session.save();
    expect(session.saving()).toBeTrue();
    expect(session.dirty()).toBeTrue();
    session.rename('A newer name');
    editor.addShape('rectangle');
    resolveSave();
    await pending;
    expect(session.dirty()).toBeTrue();
    expect(session.title()).toBe('A newer name');
    expect(editor.layers().length).toBe(2);
    repository.save.and.resolveTo();
    await session.save();
    expect(session.dirty()).toBeFalse();
    const snapshot: ConstructorDocument = repository.save.calls.mostRecent().args[0];
    expect(JSON.parse(snapshot.pages[0].scene).objects.length).toBe(2);
  });

  it('keeps edits after a failed save', async () => {
    repository.save.and.rejectWith(new Error('Storage unavailable'));
    editor.addText();
    await expectAsync(session.save()).toBeRejected();
    expect(session.dirty()).toBeTrue();
    expect(session.saving()).toBeFalse();
    expect(editor.layers().length).toBe(1);
  });
});
