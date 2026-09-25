import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CvDraft, CvInfo } from './cv-draft';
import { SavedCvs } from './saved-cvs';
import { SaveCv } from './save-cv';
import { ToastService } from '../../shared/ui/toast/toast.service';

describe('CV save feedback', () => {
  const info: CvInfo = {
    name: 'Ada', positionTitle: 'Engineer', description: 'Hello',
    photo: null, languages: [], experiences: [], technologies: []
  };
  let storage: jasmine.SpyObj<SavedCvs>;
  let save: SaveCv;
  let draft: CvDraft;
  let toasts: ToastService;
  const listError = signal('');

  beforeEach(() => {
    listError.set('');
    storage = jasmine.createSpyObj<SavedCvs>('SavedCvs', ['save'], { error: listError });
    storage.save.and.resolveTo('saved-id');
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: SavedCvs, useValue: storage }]
    });
    save = TestBed.inject(SaveCv);
    draft = TestBed.inject(CvDraft);
    toasts = TestBed.inject(ToastService);
  });

  it('announces committed saves and updates the existing record on subsequent saves', async () => {
    await save.save(info);
    expect(draft.savedId()).toBe('saved-id');
    expect(draft.current()).toEqual(info);
    expect(toasts.messages()[0].theme).toBe('success');
    expect(toasts.messages()[0].message).toContain('saved');
    await save.save({ ...info, name: 'Updated' });
    expect(storage.save.calls.mostRecent().args[1]).toBe('saved-id');
    expect(toasts.messages()[1].message).toContain('updated');
  });

  it('prevents overlapping saves and waits for completion before announcing success', async () => {
    let finish!: (id: string) => void;
    storage.save.and.returnValue(new Promise((resolve) => { finish = resolve; }));
    const pending = save.save(info);
    expect(save.saving()).toBeTrue();
    expect(toasts.messages().length).toBe(0);
    await save.save(info);
    expect(storage.save).toHaveBeenCalledTimes(1);
    finish('saved-id');
    await pending;
    expect(save.saving()).toBeFalse();
    expect(toasts.messages()[0].theme).toBe('success');
  });

  it('finishes a save after navigation without replacing a different CV', async () => {
    let finish!: (id: string) => void;
    storage.save.and.returnValue(new Promise((resolve) => { finish = resolve; }));
    const pending = save.save(info);
    draft.reset();
    draft.save({ ...info, name: 'Another CV' });
    draft.savedId.set('another-id');
    finish('saved-id');
    await pending;
    expect(draft.savedId()).toBe('another-id');
    expect(draft.current()?.name).toBe('Another CV');
    expect(toasts.messages()[0].theme).toBe('success');
  });

  it('preserves newer draft edits while attaching the completed save ID', async () => {
    let finish!: (id: string) => void;
    storage.save.and.returnValue(new Promise((resolve) => { finish = resolve; }));
    const pending = save.save(info);
    draft.save({ ...info, name: 'Newer edits' });
    finish('saved-id');
    await pending;
    expect(draft.savedId()).toBe('saved-id');
    expect(draft.current()?.name).toBe('Newer edits');
  });

  it('shows a danger toast on failure and allows retry without changing the draft', async () => {
    draft.save(info);
    storage.save.and.rejectWith(new DOMException('Full', 'QuotaExceededError'));
    await save.save({ ...info, name: 'Unsaved' });
    expect(toasts.messages()[0].theme).toBe('danger');
    expect(toasts.messages()[0].message).toContain('Storage is full');
    expect(draft.current()).toEqual(info);
    expect(draft.savedId()).toBeNull();
    expect(save.saving()).toBeFalse();
    storage.save.and.resolveTo('saved-id');
    await save.save(info);
    expect(toasts.messages()[1].theme).toBe('success');
  });

  it('uses an alert when there is no CV to save', async () => {
    await save.save(null);
    expect(storage.save).not.toHaveBeenCalled();
    expect(toasts.messages()[0].theme).toBe('alert');
  });

  it('reports a successful save with a failed list refresh as an alert', async () => {
    listError.set('Refresh failed');
    await save.save(info);
    expect(draft.savedId()).toBe('saved-id');
    expect(toasts.messages()[0].theme).toBe('alert');
    expect(toasts.messages()[0].message).toContain('was saved');
  });
});

