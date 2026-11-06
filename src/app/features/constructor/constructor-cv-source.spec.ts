import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CvDraft, CvInfo } from '../cv/services/cv-draft';
import { SavedCvs } from '../cv/services/saved-cvs';
import { ConstructorCvSource } from './constructor-cv-source';

@Component({ template: '', providers: [CvDraft, ConstructorCvSource] })
class SourceHost {
  readonly source = inject(ConstructorCvSource);
  readonly previewDraft = inject(CvDraft);
}

describe('Constructor CV source adapter', () => {
  const info: CvInfo = {
    name: 'Alex', positionTitle: '', description: '', photo: null,
    technologies: [], languages: [], experiences: [],
  };

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  it('renders and clears an isolated draft without modifying the source CV', async () => {
    const original = TestBed.inject(CvDraft);
    original.save(info);
    original.savedId.set('original-id');
    const host = TestBed.createComponent(SourceHost).componentInstance;
    const source = await host.source.load(null);
    expect(source).toEqual({ title: 'Alex_design', sourceCvId: 'original-id', render: jasmine.any(Function) });
    expect(host.previewDraft.current()).toBeNull();
    source!.render();
    expect(host.previewDraft.current()).toEqual(info);
    host.source.reset();
    expect(host.previewDraft.current()).toBeNull();
    expect(original.current()).toEqual(info);
    expect(original.savedId()).toBe('original-id');
  });

  it('loads saved CVs through the host repository and handles missing sources', async () => {
    const saved = spyOn(TestBed.inject(SavedCvs), 'load').and.resolveTo(info);
    const host = TestBed.createComponent(SourceHost).componentInstance;
    const source = await host.source.load('saved-id');
    expect(source).toEqual({ title: 'Alex_design', sourceCvId: 'saved-id', render: jasmine.any(Function) });
    source!.render();
    expect(saved).toHaveBeenCalledOnceWith('saved-id');
    host.source.reset();
    saved.and.resolveTo(null);
    expect(await host.source.load('missing')).toBeNull();
    expect(host.previewDraft.current()).toBeNull();
  });

  it('does not overwrite a newer preview when a discarded older request completes', async () => {
    let completeOlder!: (value: CvInfo) => void;
    const older = new Promise<CvInfo>((resolve) => { completeOlder = resolve; });
    const saved = spyOn(TestBed.inject(SavedCvs), 'load');
    saved.withArgs('older').and.returnValue(older);
    saved.withArgs('newer').and.resolveTo({ ...info, name: 'Newer CV' });
    const host = TestBed.createComponent(SourceHost).componentInstance;
    const pending = host.source.load('older');
    const newer = await host.source.load('newer');
    newer!.render();
    completeOlder({ ...info, name: 'Older CV' });
    expect((await pending)?.title).toBe('Older CV_design');
    expect(host.previewDraft.current()?.name).toBe('Newer CV');
  });
});
