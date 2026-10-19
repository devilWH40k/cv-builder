import { CvDraft, CvInfo, DEFAULT_CV_STRUCTURE } from './cv-draft';

describe('Unsaved CV changes', () => {
  const info: CvInfo = {
    name: 'Ada', positionTitle: 'Engineer', description: 'Summary', photo: null,
    languages: [], technologies: [], experiences: []
  };
  let draft: CvDraft;

  beforeEach(() => { draft = new CvDraft(); });

  it('starts clean and detects edits and their reversal regardless of property order', () => {
    expect(draft.hasUnsavedChanges()).toBeFalse();
    draft.beginEditing(info);
    expect(draft.hasUnsavedChanges()).toBeFalse();
    draft.save({ ...info, name: 'Grace' });
    expect(draft.hasUnsavedChanges()).toBeTrue();
    const { name, ...fields } = info;
    draft.save({ ...fields, name });
    expect(draft.hasUnsavedChanges()).toBeFalse();
  });

  it('tracks structure, collection edits, and removing an entry', () => {
    draft.beginEditing(info);
    draft.updateStructure({ ...DEFAULT_CV_STRUCTURE, sidebarPosition: 'left' });
    expect(draft.hasUnsavedChanges()).toBeTrue();
    draft.updateStructure(DEFAULT_CV_STRUCTURE);
    expect(draft.hasUnsavedChanges()).toBeFalse();
    draft.save({ ...info, technologies: ['Angular'] });
    expect(draft.hasUnsavedChanges()).toBeTrue();
    draft.save(info);
    expect(draft.hasUnsavedChanges()).toBeFalse();
  });

  it('distinguishes photos with identical metadata and treats the same immutable File as unchanged', () => {
    const photo = new File(['photo one'], 'photo.png', { type: 'image/png', lastModified: 1 });
    const initial = { ...info, photo };
    draft.beginEditing(initial);
    draft.save({ ...initial });
    expect(draft.hasUnsavedChanges()).toBeFalse();
    draft.save({ ...initial, photo: new File(['photo two'], photo.name,
      { type: photo.type, lastModified: photo.lastModified }) });
    expect(draft.hasUnsavedChanges()).toBeTrue();
  });

  it('preserves unsaved state when reopening the editor and resets it for a new CV', () => {
    draft.beginEditing(info);
    draft.save({ ...info, name: 'Changed' });
    draft.beginEditing(draft.current()!);
    expect(draft.hasUnsavedChanges()).toBeTrue();
    draft.reset();
    draft.beginEditing(info);
    expect(draft.hasUnsavedChanges()).toBeFalse();
  });

  it('does not mark edits made during a save as saved', () => {
    draft.beginEditing(info);
    const saving = { ...info, name: 'Saving this version' };
    draft.save(saving);
    draft.save({ ...saving, description: 'Newer edit' });
    draft.markSaved(saving);
    expect(draft.hasUnsavedChanges()).toBeTrue();
    draft.save(saving);
    expect(draft.hasUnsavedChanges()).toBeFalse();
  });
});
