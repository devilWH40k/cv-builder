import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SavedCv, SavedCvs } from '../../cv/services/saved-cvs';
import { CvClipboard } from './cv-clipboard';

describe('CV cut clipboard', () => {
  const records = signal<readonly SavedCv[]>([]);
  beforeEach(() => {
    records.set(['a', 'b'].map((id) => ({ id, updatedAt: 1, info: { name: id, photo: null,
      positionTitle: '', description: '', languages: [], technologies: [], experiences: [] } })));
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
      { provide: SavedCvs, useValue: { all: records.asReadonly() } }] });
  });

  it('holds a single cut CV, ignores unknown IDs, and clears only the moved selection', () => {
    const clipboard = TestBed.inject(CvClipboard);
    expect(clipboard.cutId()).toBeNull();
    clipboard.cut('a');
    expect(clipboard.cutId()).toBe('a');
    clipboard.cut('missing');
    expect(clipboard.cutId()).toBe('a');
    clipboard.cut('b');
    clipboard.clear('a');
    expect(clipboard.cutId()).toBe('b');
    clipboard.clear('b');
    expect(clipboard.cutId()).toBeNull();
  });

  it('invalidates a removed CV so it cannot be pasted', () => {
    const clipboard = TestBed.inject(CvClipboard);
    clipboard.cut('a');
    records.update((cvs) => cvs.filter((cv) => cv.id !== 'a'));
    expect(clipboard.cutId()).toBeNull();
  });
});
