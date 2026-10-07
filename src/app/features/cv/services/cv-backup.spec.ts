import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CvBackup } from './cv-backup';
import { SavedCvs } from './saved-cvs';
import { createArchive, readArchive } from '../helpers/cv-archive';

describe('CV backup service', () => {
  let saved: jasmine.SpyObj<SavedCvs>;
  let backup: CvBackup;

  beforeEach(() => {
    saved = jasmine.createSpyObj<SavedCvs>('SavedCvs', ['backupSnapshot', 'importRecords']);
    saved.backupSnapshot.and.resolveTo({ cvs: [], experiences: [] });
    saved.importRecords.and.resolveTo();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), { provide: SavedCvs, useValue: saved }] });
    backup = TestBed.inject(CvBackup);
  });

  it('downloads a fresh archive and appends the extension only once', async () => {
    const create = spyOn(URL, 'createObjectURL').and.returnValue('blob:backup');
    const click = spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('custom.zip');
      expect(this.isConnected).toBeTrue();
    });
    await backup.export(' custom.zip ');
    expect(saved.backupSnapshot).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    const blob = create.calls.mostRecent().args[0];
    expect(blob instanceof Blob).toBeTrue();
    if (blob instanceof Blob) expect(await readArchive(blob)).toEqual({ cvs: [], experiences: [], technologies: [] });
    expect(document.querySelector('a[download="custom.zip"]')).toBeNull();
  });

  it('does not write anything for an invalid backup', async () => {
    await expectAsync(backup.import(new File(['invalid'], 'backup.zip'), true)).toBeRejected();
    expect(saved.importRecords).not.toHaveBeenCalled();
  });

  it('imports a validated backup and reports storage failures meaningfully', async () => {
    const file = new File([await createArchive([])], 'backup.zip');
    expect(await backup.import(file)).toEqual({ cvs: 0, experiences: 0, technologies: 0 });
    expect(saved.importRecords).toHaveBeenCalledOnceWith([], [], false, []);
    saved.importRecords.and.rejectWith(new Error('Internal storage error'));
    await expectAsync(backup.import(file)).toBeRejectedWithError(/Browser storage may be full/);
  });

  it('passes the wipe option only after validating the archive', async () => {
    const file = new File([await createArchive([])], 'backup.zip');
    await backup.import(file, true);
    expect(saved.importRecords).toHaveBeenCalledOnceWith([], [], true, []);
  });

  it('exports independent saved experiences and passes them to atomic import with both counts', async () => {
    const experience = {
      id: 'reusable', updatedAt: 42,
      experience: { savedExperienceId: 'reusable', company: 'Example', position: 'Engineer',
        startDate: '2020', endDate: '', isCurrent: true, technologies: ['Angular'], description: '<p>Work</p>' }
    };
    const technologies = [{ id: 'sdk', name: 'SDK', updatedAt: 42 }];
    saved.backupSnapshot.and.resolveTo({ cvs: [], experiences: [experience], technologies });
    const create = spyOn(URL, 'createObjectURL').and.returnValue('blob:experiences');
    spyOn(HTMLAnchorElement.prototype, 'click');
    await backup.export('experiences');
    const blob = create.calls.mostRecent().args[0];
    if (!(blob instanceof Blob)) throw new Error('Expected an archive Blob');
    expect(await backup.import(new File([blob], 'experiences.zip')))
      .toEqual({ cvs: 0, experiences: 1, technologies: 1 });
    expect(saved.importRecords).toHaveBeenCalledOnceWith([], [experience], false, technologies);
  });

});
