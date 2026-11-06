import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ConstructorTour, CONSTRUCTOR_TOUR_KEY } from './constructor-tour';
import { ConstructorSession } from './constructor-session';
import { ConstructorEditor } from './constructor-editor';
import { ConstructorRepository } from 'constructor/core';
import { blankDesign } from 'constructor/canvas';
import { validateDesignScene } from 'constructor/core';
import { FabricObject, util } from 'fabric';
import { A4_HEIGHT, A4_WIDTH } from 'constructor/core';

describe('Constructor first-visit tutorial', () => {
  let tour: ConstructorTour;
  let session: ConstructorSession;
  let editor: jasmine.SpyObj<ConstructorEditor>;
  let scene: string;
  let saved: string | null;
  const undoHistory = signal<readonly string[]>([]);

  beforeEach(() => {
    saved = null;
    undoHistory.set([]);
    scene = blankDesign().pages[0].scene;
    editor = jasmine.createSpyObj<ConstructorEditor>('editor', ['load', 'snapshot', 'finishEditing', 'select', 'restoreUndoHistory', 'setZoom'], {
      busy: signal(false), pageGuides: signal([]), undoCount: undoHistory, redoCount: signal([]), zoom: signal(1),
    });
    editor.load.and.callFake(async (page) => { scene = page.scene; });
    editor.snapshot.and.callFake(() => scene);
    spyOn(Storage.prototype, 'getItem').and.callFake((key) => key === CONSTRUCTOR_TOUR_KEY ? saved : null);
    spyOn(Storage.prototype, 'setItem').and.callFake((key, value) => {
      if (key === CONSTRUCTOR_TOUR_KEY) saved = value;
    });
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), ConstructorTour, ConstructorSession,
      { provide: ConstructorEditor, useValue: editor },
      { provide: ConstructorRepository, useValue: {} }],
    });
    tour = TestBed.inject(ConstructorTour);
    session = TestBed.inject(ConstructorSession);
  });

  it('shows three valid examples, selects their properties, and restores an unsaved design', async () => {
    const original = blankDesign();
    await session.open(original, true);
    await tour.start();
    expect(tour.active()).toBeTrue();
    expect(session.document()?.title).toBe('Constructor tutorial');
    expect(() => validateDesignScene(scene)).not.toThrow();
    const sample = JSON.parse(scene) as { objects: { designId: string; type: string }[] };
    expect(sample.objects.map((object) => object.type)).toEqual(['Rect', 'Image', 'Textbox']);
    const objects = await util.enlivenObjects<FabricObject>(sample.objects);
    const bounds = objects.map((object) => object.getBoundingRect());
    for (const object of bounds) {
      expect(object.left).toBeGreaterThanOrEqual(32);
      expect(object.top).toBeGreaterThanOrEqual(32);
      expect(object.left + object.width).toBeLessThanOrEqual(A4_WIDTH - 32);
      expect(object.top + object.height).toBeLessThanOrEqual(A4_HEIGHT - 32);
    }
    expect(bounds[0].top + bounds[0].height).toBeLessThan(bounds[1].top);
    expect(bounds[1].top + bounds[1].height).toBeLessThan(bounds[2].top);
    objects.forEach((object) => object.dispose());
    for (let index = 2; index <= 4; index++) {
      tour.selectStep(index);
      expect(editor.select).toHaveBeenCalledWith(sample.objects[index - 2].designId);
    }
    await tour.finish();
    expect(session.document()?.id).toBe(original.id);
    expect(session.document()?.pages[0].scene).toBe(original.pages[0].scene);
    expect(session.dirty()).toBeTrue();
    expect(tour.active()).toBeFalse();
    expect(saved).toBe('done');
  });

  it('waits for an open design and runs only once in this session', async () => {
    await tour.start();
    expect(tour.active()).toBeFalse();
    expect(editor.load).not.toHaveBeenCalled();
    const original = blankDesign();
    await session.open(original, true);
    await tour.start();
    expect(tour.active()).toBeTrue();
    await tour.finish();
    expect(session.document()?.id).toBe(original.id);
    await tour.start();
    expect(tour.active()).toBeFalse();
  });

  it('does not open a tutorial for a returning visitor', async () => {
    saved = 'done';
    await session.open(blankDesign());
    editor.load.calls.reset();
    await tour.start();
    expect(tour.active()).toBeFalse();
    expect(editor.load).not.toHaveBeenCalled();
  });

  it('still works when local storage is blocked', async () => {
    (Storage.prototype.getItem as jasmine.Spy).and.throwError('blocked');
    (Storage.prototype.setItem as jasmine.Spy).and.throwError('blocked');
    const original = blankDesign();
    await session.open(original);
    await tour.start();
    await tour.finish();
    expect(session.document()?.id).toBe(original.id);
    expect(session.dirty()).toBeFalse();
    expect(tour.active()).toBeFalse();
  });

  it('restarts a completed tour and restores the active page, edits, and undo history', async () => {
    saved = 'done';
    const original = blankDesign();
    await session.open(original);
    await session.addPage();
    const activeScene = JSON.stringify({ objects: [], background: '#d1faff' });
    scene = activeScene;
    const undo = [original.pages[0].scene];
    undoHistory.set(undo);
    await tour.start();
    expect(tour.active()).toBeFalse();
    await tour.start(true);
    expect(tour.active()).toBeTrue();
    await tour.finish();
    expect(session.document()?.id).toBe(original.id);
    expect(session.activePage()).toBe(1);
    expect(scene).toBe(activeScene);
    expect(session.dirty()).toBeTrue();
    expect(editor.restoreUndoHistory).toHaveBeenCalledWith(undo, []);
    await tour.start(true);
    expect(tour.active()).toBeTrue();
    await tour.finish();
  });
});
