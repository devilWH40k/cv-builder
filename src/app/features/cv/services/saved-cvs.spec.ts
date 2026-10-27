import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CV_DATABASE_NAME, SavedCvs } from './saved-cvs';
import { CvInfo } from './cv-draft';
import { LEGACY_STORAGE_KEY } from '../helpers/legacy-saved-cvs';

describe('IndexedDB saved CVs', () => {
  let databaseName: string;
  let legacy: Map<string, string>;
  const info: CvInfo = {
    name: 'Ada Lovelace', positionTitle: 'Engineer', description: 'Builds things',
    photo: null, languages: [{ language: 'English', level: 'Native' }],
    technologies: ['Angular'], experiences: [{
      company: 'Example', position: 'Developer', startDate: '2020', endDate: '',
      isCurrent: true, technologies: ['TypeScript'], description: '<p>Projects</p>'
    }]
  };
  const service = () => TestBed.runInInjectionContext(() => new SavedCvs());

  it('persists education through saves, loads, and backup snapshots', async () => {
    const education = [{ university: 'Independent University', degree: 'Bachelor', field: 'Cybersecurity',
      startDate: '2018', endDate: '2022' }];
    const saved = service();
    const id = await saved.save({ ...info, education }, null);
    expect((await saved.load(id))?.education).toEqual(education);
    expect((await saved.backupSnapshot()).cvs[0].info.education).toEqual(education);
  });

  it('persists contact information through saves, loads and backup snapshots', async () => {
    const contact = { phone: '+380501234567', email: 'ada@example.com',
      socials: [{ network: 'Telegram', value: '@ada_dev' }] };
    const saved = service();
    const id = await saved.save({ ...info, contact }, null);
    expect((await saved.load(id))?.contact).toEqual(contact);
    expect((await saved.backupSnapshot()).cvs[0].info.contact).toEqual(contact);
  });

  it('preserves custom icons when saving and loading CVs and reusable experiences', async () => {
    const customTechnologyIcons = { SDK: document.createElement('canvas').toDataURL('image/png') };
    const experience = { ...info.experiences[0], technologies: ['SDK'], customTechnologyIcons };
    const stored = { ...info, technologies: ['SDK'], customTechnologyIcons, experiences: [experience] };
    const saved = service();
    const id = await saved.save(stored, null);
    expect(await saved.load(id)).toEqual(stored);
    await saved.saveExperience(experience);
    expect((await saved.listExperiences())[0].experience.customTechnologyIcons).toEqual(customTechnologyIcons);
  });

  beforeEach(() => {
    databaseName = 'cv-builder-test-' + crypto.randomUUID();
    legacy = new Map();
    spyOn(Storage.prototype, 'getItem').and.callFake((key) => legacy.get(key) ?? null);
    spyOn(Storage.prototype, 'removeItem').and.callFake((key) => { legacy.delete(key); });
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: CV_DATABASE_NAME, useValue: databaseName }]
    });
    spyOn(navigator.storage, 'estimate').and.resolveTo({
      usage: 2 * 1024 ** 2, quota: 10 * 1024 ** 3
    });
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Test database is still open.'));
    });
  });

  it('saves experiences independently and updates linked records without duplicates', async () => {
    const saved = service();
    const id = await saved.saveExperience(info.experiences[0]);
    const linked = { ...info.experiences[0], savedExperienceId: id };
    expect(await service().listExperiences()).toEqual([
      jasmine.objectContaining({ id, experience: linked })
    ]);
    expect(await saved.saveExperience({ ...linked, company: 'Updated' })).toBe(id);
    expect((await service().listExperiences()).length).toBe(1);
    expect((await service().listExperiences())[0].experience.company).toBe('Updated');
    const cvId = await saved.save({ ...info, experiences: [linked] }, null);
    expect((await saved.load(cvId))?.experiences[0].savedExperienceId).toBe(id);
    await saved.delete(cvId);
    expect((await saved.listExperiences()).length).toBe(1);
  });

  it('persists project metadata updates while preserving existing CV snapshots', async () => {
    const saved = service();
    const experience = { ...info.experiences[0], alternativeNames: 'Modelize',
      webLink: 'https://replique.io/', photos: 'https://example.com/photos', responsibilities: 'Frontend',
      teamlead: 'Lead', developer: 'Ada', isUpdated: false };
    const id = await saved.saveExperience(experience);
    const linked = { ...experience, savedExperienceId: id };
    const cvId = await saved.save({ ...info, experiences: [linked] }, null);
    await saved.saveExperience({ ...linked, responsibilities: 'Updated responsibilities', isUpdated: true });
    const records = await service().listExperiences();
    expect(records.length).toBe(1);
    expect(records[0].experience).toEqual({ ...linked, responsibilities: 'Updated responsibilities', isUpdated: true });
    expect((await saved.load(cvId))?.experiences).toEqual([linked]);
  });

  it('deletes library experiences persistently without changing saved CV snapshots', async () => {
    const saved = service();
    const id = await saved.saveExperience(info.experiences[0]);
    const linked = { ...info.experiences[0], savedExperienceId: id };
    const cvId = await saved.save({ ...info, experiences: [linked] }, null);
    await saved.deleteExperience(id);
    expect(await service().listExperiences()).toEqual([]);
    expect((await saved.load(cvId))?.experiences).toEqual([linked]);
    expect((await saved.backupSnapshot()).experiences).toEqual([]);
  });

  it('saves a linked experience in the library and current CV without changing other saved fields or CVs', async () => {
    const saved = service();
    const id = await saved.saveExperience(info.experiences[0]);
    const linked = { ...info.experiences[0], savedExperienceId: id };
    const original = { ...info, experiences: [linked, { ...linked, savedExperienceId: 'other', company: 'Other' }] };
    const cvId = await saved.save(original, null);
    const otherCv = await saved.save(original, null);
    const folder = await saved.createFolder('Applications');
    await saved.moveCv(cvId, folder.id);
    const updated = { ...linked, company: 'Updated', technologies: ['Angular'], description: '<p>New work</p>' };
    expect(await saved.saveExperience(updated, cvId)).toBe(id);
    const reopened = service();
    expect(await reopened.load(cvId)).toEqual({ ...original, experiences: [updated, original.experiences[1]] });
    expect(await reopened.load(otherCv)).toEqual(original);
    expect((await reopened.listExperiences())[0].experience).toEqual(updated);
    expect(saved.all().find((cv) => cv.id === cvId)?.info.experiences[0]).toEqual(updated);
    expect(saved.folders()[0].cvIds).toEqual([cvId]);
  });

  it('rolls back the library save if updating the linked CV fails', async () => {
    const saved = service();
    const id = await saved.saveExperience(info.experiences[0]);
    const linked = { ...info.experiences[0], savedExperienceId: id };
    const original = { ...info, experiences: [linked] };
    const cvId = await saved.save(original, null);
    const put = IDBObjectStore.prototype.put;
    spyOn(IDBObjectStore.prototype, 'put').and.callFake(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (this.name === 'cvs') throw new Error('Storage unavailable');
      return key === undefined ? put.call(this, value) : put.call(this, value, key);
    });
    await expectAsync(saved.saveExperience({ ...linked, company: 'Updated' }, cvId)).toBeRejected();
    expect(await saved.load(cvId)).toEqual(original);
    expect((await saved.listExperiences())[0].experience).toEqual(linked);
  });

  it('does not save the library update or recreate a deleted current CV', async () => {
    const saved = service();
    const id = await saved.saveExperience(info.experiences[0]);
    const linked = { ...info.experiences[0], savedExperienceId: id };
    await expectAsync(saved.saveExperience({ ...linked, company: 'Updated' }, 'missing-cv')).toBeRejected();
    expect(await saved.load('missing-cv')).toBeNull();
    expect((await saved.listExperiences())[0].experience).toEqual(linked);
  });

  it('imports new experience records as one batch without replacing existing saves or supplied IDs', async () => {
    const saved = service();
    const existingId = await saved.saveExperience(info.experiences[0]);
    const cvId = await saved.save(info, null);
    const imported = await saved.importExperiences([
      { ...info.experiences[0], savedExperienceId: existingId, company: 'Imported 1' },
      { ...info.experiences[0], company: 'Imported 2' }
    ]);
    expect(imported.length).toBe(2);
    expect(imported[0].id).not.toBe(existingId);
    expect(imported[0].experience.savedExperienceId).toBe(imported[0].id);
    expect((await service().listExperiences()).map((record) => record.experience.company).sort())
      .toEqual(['Example', 'Imported 1', 'Imported 2']);
    expect(await saved.load(cvId)).toEqual(info);
  });

  it('rolls back every imported experience when one batch write fails', async () => {
    const saved = service();
    await saved.saveExperience(info.experiences[0]);
    const before = await saved.backupSnapshot();
    const add = IDBObjectStore.prototype.add;
    let writes = 0;
    spyOn(IDBObjectStore.prototype, 'add').and.callFake(function (this: IDBObjectStore, record: unknown, key?: IDBValidKey) {
      if (this.name === 'experiences' && ++writes === 2) throw new Error('Write failed');
      return add.call(this, record, key);
    });
    await expectAsync(saved.importExperiences([info.experiences[0], info.experiences[0]])).toBeRejected();
    expect(await saved.backupSnapshot()).toEqual(before);
  });

  it('upgrades version 1 without losing existing CVs', async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('cvs', { keyPath: 'id' }).put({ id: 'existing', info, updatedAt: 1 });
        request.result.createObjectStore('metadata');
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { request.result.close(); resolve(); };
    });
    const saved = service();
    expect(await saved.load('existing')).toEqual(info);
    expect(await saved.listExperiences()).toEqual([]);
    await saved.saveExperience(info.experiences[0]);
    expect((await saved.listExperiences()).length).toBe(1);
  });

  it('persists snapshots across instances and updates the same record', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    const restored = service();
    expect(await restored.load(id)).toEqual(info);
    await restored.save({ ...info, name: 'Updated' }, id);
    expect(restored.all().length).toBe(1);
    expect((await saved.load(id))?.name).toBe('Updated');
    expect((await saved.load(id))?.experiences).toEqual(info.experiences);
  });

  it('preserves structure options when saving and reopening a CV', async () => {
    const structuredInfo: CvInfo = { ...info,
      structure: { photoSizeMm: 52, showPhoto: false, theme: 'dark-blue', sidebarPosition: 'left', technologiesView: 'comma-separated', sidebarTechnologiesView: 'blocks' } };
    const id = await service().save(structuredInfo, null);
    expect(await service().load(id)).toEqual(structuredInfo);
  });

  it('creates independent records with equal names', async () => {
    const saved = service();
    const first = await saved.save(info, null);
    const second = await saved.save(info, null);
    expect(first).not.toBe(second);
    expect(saved.all().length).toBe(2);
  });

  it('persists manual order through fresh service loads, edits, new saves, and deletion without altering CV data', async () => {
    const saved = service();
    await saved.importRecords(['a', 'b', 'c'].map((id, index) => ({ id, info: { ...info, name: id }, updatedAt: 3 - index })));
    const original = await saved.backupSnapshot();
    await saved.reorderCv({ cvId: 'c', targetId: 'a', position: 'before' });
    expect(saved.all().map((cv) => cv.id)).toEqual(['c', 'a', 'b']);
    expect(await saved.backupSnapshot()).toEqual(original);
    const reloaded = service();
    await reloaded.refresh();
    expect(reloaded.all().map((cv) => cv.id)).toEqual(['c', 'a', 'b']);
    await reloaded.save({ ...info, name: 'Edited' }, 'a');
    expect(reloaded.all().map((cv) => cv.id)).toEqual(['c', 'a', 'b']);
    const newId = await reloaded.save(info, null);
    expect(reloaded.all().map((cv) => cv.id)).toEqual([newId, 'c', 'a', 'b']);
    await reloaded.reorderCv({ cvId: 'c', targetId: 'b', position: 'after' });
    expect(reloaded.all().map((cv) => cv.id)).toEqual([newId, 'a', 'b', 'c']);
    await reloaded.delete('b');
    const anotherLoad = service();
    await anotherLoad.refresh();
    expect(anotherLoad.all().map((cv) => cv.id)).toEqual([newId, 'a', 'c']);
  });

  it('reorders folder CVs independently and rejects cross-collection or stale targets', async () => {
    const saved = service();
    await saved.importRecords(['a', 'b', 'c', 'd'].map((id, index) => ({ id, info, updatedAt: 4 - index })));
    const folder = await saved.createFolder('Applications');
    await saved.moveCv('b', folder.id);
    await saved.moveCv('d', folder.id);
    await saved.reorderCv({ cvId: 'd', targetId: 'b', position: 'before' });
    const reloaded = service();
    await reloaded.refresh();
    const folderIds = new Set(reloaded.folders()[0].cvIds);
    expect(reloaded.all().filter((cv) => folderIds.has(cv.id)).map((cv) => cv.id)).toEqual(['d', 'b']);
    expect(reloaded.all().filter((cv) => !folderIds.has(cv.id)).map((cv) => cv.id)).toEqual(['a', 'c']);
    const before = reloaded.all();
    await expectAsync(reloaded.reorderCv({ cvId: 'a', targetId: 'b', position: 'before' })).toBeRejected();
    await expectAsync(reloaded.reorderCv({ cvId: 'a', targetId: 'missing', position: 'after' })).toBeRejected();
    await expectAsync(reloaded.reorderCv({ cvId: 'missing', targetId: 'a', position: 'after' })).toBeRejected();
    expect(reloaded.all()).toEqual(before);
    expect(reloaded.folders()).toEqual(saved.folders());
  });

  it('retains the last committed order when a new order cannot be written', async () => {
    const saved = service();
    await saved.importRecords(['a', 'b', 'c'].map((id, index) => ({ id, info, updatedAt: 3 - index })));
    await saved.reorderCv({ cvId: 'c', targetId: 'a', position: 'before' });
    const put = IDBObjectStore.prototype.put;
    spyOn(IDBObjectStore.prototype, 'put').and.callFake(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (this.name === 'metadata' && key === 'cv-order') throw new Error('Storage unavailable');
      return put.call(this, value, key);
    });
    await expectAsync(saved.reorderCv({ cvId: 'c', targetId: 'b', position: 'after' })).toBeRejected();
    const reloaded = service();
    await reloaded.refresh();
    expect(reloaded.all().map((cv) => cv.id)).toEqual(['c', 'a', 'b']);
    expect(saved.all()).toEqual(reloaded.all());
  });

  it('clears manual order when replacing the database with an import', async () => {
    const saved = service();
    const records = ['a', 'b', 'c'].map((id, index) => ({ id, info, updatedAt: 3 - index }));
    await saved.importRecords(records);
    await saved.reorderCv({ cvId: 'c', targetId: 'a', position: 'before' });
    await saved.importRecords(records, [], true);
    expect(saved.all().map((cv) => cv.id)).toEqual(['a', 'b', 'c']);
  });

  it('creates persistent empty folders with trimmed names and validates names', async () => {
    const saved = service();
    const folder = await saved.createFolder('  Applications  ');
    expect(folder.name).toBe('Applications');
    expect(folder.cvIds).toEqual([]);
    const reloaded = service();
    await reloaded.refresh();
    expect(reloaded.folders()).toEqual([folder]);
    await expectAsync(saved.createFolder('   ')).toBeRejected();
    await expectAsync(saved.createFolder('a'.repeat(121))).toBeRejected();
    expect(saved.folders().length).toBe(1);
    await saved.deleteFolder(folder.id);
    expect(saved.folders()).toEqual([]);
  });

  it('moves CVs between folders and back to the main list without changing their contents', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    const first = await saved.createFolder('First');
    const second = await saved.createFolder('Second');
    await saved.moveCv(id, first.id);
    await saved.moveCv(id, first.id);
    expect(saved.folders().find((folder) => folder.id === first.id)?.cvIds).toEqual([id]);
    await saved.save({ ...info, name: 'Updated' }, id);
    expect(saved.folders().find((folder) => folder.id === first.id)?.cvIds).toEqual([id]);
    await saved.moveCv(id, second.id);
    expect(saved.folders().find((folder) => folder.id === first.id)?.cvIds).toEqual([]);
    expect(saved.folders().find((folder) => folder.id === second.id)?.cvIds).toEqual([id]);
    const reloaded = service();
    await reloaded.refresh();
    expect(reloaded.folders()).toEqual(saved.folders());
    await saved.moveCv(id, null);
    expect(saved.folders().every((folder) => !folder.cvIds.length)).toBeTrue();
    expect(await saved.load(id)).toEqual({ ...info, name: 'Updated' });
  });

  it('rejects nonempty folder deletion and invalid move targets atomically', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    const folder = await saved.createFolder('Applications');
    await saved.moveCv(id, folder.id);
    await expectAsync(saved.deleteFolder(folder.id)).toBeRejectedWithError(/empty/);
    await expectAsync(saved.moveCv(id, 'missing')).toBeRejected();
    await expectAsync(saved.moveCv('missing', folder.id)).toBeRejected();
    expect((await service().backupSnapshot()).folders).toEqual([{ ...folder, cvIds: [id] }]);
    await saved.delete(id);
    expect(saved.folders()).toEqual([folder]);
    await saved.deleteFolder(folder.id);
    expect(saved.folders()).toEqual([]);
  });

  it('rolls back folder moves when writing the destination fails', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    const first = await saved.createFolder('First');
    const second = await saved.createFolder('Second');
    await saved.moveCv(id, first.id);
    const before = await saved.backupSnapshot();
    const put = IDBObjectStore.prototype.put;
    spyOn(IDBObjectStore.prototype, 'put').and.callFake(function (
      this: IDBObjectStore, value: unknown, key?: IDBValidKey
    ) {
      if (this.name === 'folders' && typeof value === 'object' && value !== null &&
        'id' in value && value.id === second.id) throw new Error('Folder write failed');
      return put.call(this, value, key);
    });
    await expectAsync(saved.moveCv(id, second.id)).toBeRejected();
    expect(await service().backupSnapshot()).toEqual(before);
    expect(saved.folders()).toEqual([...before.folders!].sort((a, b) => a.name.localeCompare(b.name)));
  });

  it('upgrades an existing database with all previous stores without losing CVs', async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 3);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('cvs', { keyPath: 'id' }).put({ id: 'existing', info, updatedAt: 1 });
        request.result.createObjectStore('metadata');
        request.result.createObjectStore('experiences', { keyPath: 'id' });
        request.result.createObjectStore('technologies', { keyPath: 'id' });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { request.result.close(); resolve(); };
    });
    const saved = service();
    await saved.refresh();
    expect(saved.all()[0].id).toBe('existing');
    expect(saved.folders()).toEqual([]);
    const folder = await saved.createFolder('Applications');
    await saved.moveCv('existing', folder.id);
    expect(await saved.load('existing')).toEqual(info);
  });

  it('rolls back CV deletion if removing its folder membership fails', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    const folder = await saved.createFolder('Applications');
    await saved.moveCv(id, folder.id);
    const before = await saved.backupSnapshot();
    spyOn(IDBObjectStore.prototype, 'put').and.throwError('Membership write failed');
    await expectAsync(saved.delete(id)).toBeRejected();
    expect(await service().backupSnapshot()).toEqual(before);
    expect(await saved.load(id)).toEqual(info);
  });

  for (const wipe of [false, true]) {
    it(`rolls back imports when folder writes fail with wipe=${wipe}`, async () => {
      const saved = service();
      const id = await saved.save(info, null);
      const folder = await saved.createFolder('Applications');
      await saved.moveCv(id, folder.id);
      const before = await saved.backupSnapshot();
      const put = IDBObjectStore.prototype.put;
      spyOn(IDBObjectStore.prototype, 'put').and.callFake(function (
        this: IDBObjectStore, value: unknown, key?: IDBValidKey
      ) {
        if (this.name === 'folders') throw new Error('Folder write failed');
        return put.call(this, value, key);
      });
      await expectAsync(saved.importRecords(before.cvs, before.experiences, wipe, before.technologies, before.folders)).toBeRejected();
      expect(await service().backupSnapshot()).toEqual(before);
      expect(saved.folders()).toEqual(before.folders!);
    });
  }

  it('round trips folder membership and merges without assigning a CV to two folders', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    const first = await saved.createFolder('First');
    await saved.moveCv(id, first.id);
    const snapshot = await saved.backupSnapshot();
    const { createArchive, readArchive } = await import('../helpers/cv-archive');
    const archive = await readArchive(await createArchive(snapshot.cvs, snapshot.experiences, snapshot.technologies, snapshot.folders));
    await saved.importRecords(archive.cvs, archive.experiences, true, archive.technologies, archive.folders);
    expect(await saved.backupSnapshot()).toEqual(snapshot);
    const second = { id: 'second', name: 'Second', cvIds: [id] };
    await saved.importRecords([], [], false, [], [second]);
    expect(saved.folders().find((folder) => folder.id === first.id)?.cvIds).toEqual([]);
    expect(saved.folders().find((folder) => folder.id === second.id)?.cvIds).toEqual([id]);
    await saved.importRecords([], [], true);
    expect(saved.folders()).toEqual([]);
    expect(saved.all()).toEqual([]);
  });

  it('stores photos directly as files with unchanged bytes and metadata', async () => {
    const saved = service();
    const photo = new File(['photo bytes'], 'photo.png', { type: 'image/png', lastModified: 123 });
    const id = await saved.save({ ...info, photo }, null);
    const restored = (await service().load(id))!.photo!;
    expect(restored instanceof File).toBeTrue();
    expect(restored.name).toBe(photo.name);
    expect(restored.type).toBe(photo.type);
    expect(restored.lastModified).toBe(123);
    expect(await restored.text()).toBe(await photo.text());
  });

  it('stores an optional company logo with unchanged bytes and metadata', async () => {
    const saved = service();
    const companyLogo = new File(['logo bytes'], 'company.png', { type: 'image/png', lastModified: 456 });
    const id = await saved.save({ ...info, companyLogo }, null);
    const restored = (await service().load(id))!.companyLogo!;
    expect(restored instanceof File).toBeTrue();
    expect(restored.name).toBe(companyLogo.name);
    expect(restored.type).toBe(companyLogo.type);
    expect(restored.lastModified).toBe(companyLogo.lastModified);
    expect(await restored.text()).toBe(await companyLogo.text());
  });

  it('preserves the previous snapshot when a write transaction aborts', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    const original = IDBObjectStore.prototype.put;
    spyOn(IDBObjectStore.prototype, 'put').and.callFake(function (
      this: IDBObjectStore, value: unknown, key?: IDBValidKey
    ) {
      const request = original.call(this, value, key);
      this.transaction.abort();
      return request;
    });
    await expectAsync(saved.save({ ...info, name: 'Lost change' }, id)).toBeRejected();
    expect((await saved.load(id))?.name).toBe(info.name);
    expect(saved.all()[0].info.name).toBe(info.name);
  });

  it('deletes only the chosen record and persists removal', async () => {
    const saved = service();
    const first = await saved.save(info, null);
    const second = await saved.save(info, null);
    await saved.delete(first);
    expect(saved.all().map((record) => record.id)).toEqual([second]);
    expect(await service().load(first)).toBeNull();
    expect(await service().load(second)).toEqual(info);
  });

  it('keeps a record when deletion fails', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    spyOn(IDBObjectStore.prototype, 'delete').and.throwError('Storage unavailable');
    await expectAsync(saved.delete(id)).toBeRejected();
    expect(saved.all().length).toBe(1);
    expect(await saved.load(id)).toEqual(info);
  });

  it('migrates legacy photos and removes local data only after commit', async () => {
    legacy.set(LEGACY_STORAGE_KEY, JSON.stringify([{
      id: 'legacy', info: { ...info, photo: {
        name: 'photo.png', type: 'image/png', base64: btoa('old photo')
      } }
    }]));
    const saved = service();
    const restored = await saved.load('legacy');
    expect(restored?.name).toBe(info.name);
    expect(await restored?.photo?.text()).toBe('old photo');
    expect(legacy.has(LEGACY_STORAGE_KEY)).toBeFalse();
    expect((await service().load('legacy'))?.name).toBe(info.name);
  });

  it('retains corrupt legacy data and allows new IndexedDB saves', async () => {
    legacy.set(LEGACY_STORAGE_KEY, '{"broken":true}');
    const saved = service();
    const id = await saved.save(info, null);
    expect(await saved.load(id)).toEqual(info);
    expect(saved.migrationWarning()).toContain('could not be migrated');
    expect(legacy.get(LEGACY_STORAGE_KEY)).toBe('{"broken":true}');
  });

  it('does not resurrect deleted CVs if removal of the legacy source failed', async () => {
    legacy.set(LEGACY_STORAGE_KEY, JSON.stringify([{ id: 'legacy', info }]));
    (Storage.prototype.removeItem as jasmine.Spy).and.throwError('Unavailable');
    const saved = service();
    expect(await saved.load('legacy')).toEqual(info);
    await saved.delete('legacy');
    expect(await service().load('legacy')).toBeNull();
    expect(legacy.has(LEGACY_STORAGE_KEY)).toBeTrue();
  });

  it('reports estimated site usage and quota, and refreshes after changes', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    expect(saved.storageEstimate()).toEqual({ usedMb: '2.00', quotaGb: '10.00' });
    (navigator.storage.estimate as jasmine.Spy).and.resolveTo({ usage: 0, quota: 1024 ** 3 });
    await saved.delete(id);
    expect(saved.storageEstimate()).toEqual({ usedMb: '0.00', quotaGb: '1.00' });
  });

  it('keeps saving available when storage estimates fail or omit values', async () => {
    const saved = service();
    (navigator.storage.estimate as jasmine.Spy).and.rejectWith(new Error('Unavailable'));
    const id = await saved.save(info, null);
    expect(saved.storageEstimate()).toBeNull();
    expect(await saved.load(id)).toEqual(info);
    (navigator.storage.estimate as jasmine.Spy).and.resolveTo({});
    await saved.refresh();
    expect(saved.storageEstimate()).toBeNull();
    expect(saved.error()).toBe('');
  });
  it('retains the legacy source when migration rolls back', async () => {
    legacy.set(LEGACY_STORAGE_KEY, JSON.stringify([{ id: 'legacy', info }]));
    const original = IDBObjectStore.prototype.put;
    const write = spyOn(IDBObjectStore.prototype, 'put').and.callFake(function (
      this: IDBObjectStore, value: unknown, key?: IDBValidKey
    ) {
      const request = original.call(this, value, key);
      if (this.name === 'cvs') this.transaction.abort();
      return request;
    });
    const saved = service();
    expect(await saved.load('legacy')).toBeNull();
    expect(saved.migrationWarning()).toContain('could not be migrated');
    expect(legacy.has(LEGACY_STORAGE_KEY)).toBeTrue();
    write.and.callThrough();
    expect(await service().load('legacy')).toEqual(info);
    expect(legacy.has(LEGACY_STORAGE_KEY)).toBeFalse();
  });

  it('reports unavailable IndexedDB without discarding legacy data', async () => {
    legacy.set(LEGACY_STORAGE_KEY, JSON.stringify([{ id: 'legacy', info }]));
    spyOn(indexedDB, 'open').and.throwError('Unavailable');
    const saved = service();
    await saved.refresh();
    expect(saved.error()).toContain('could not be read');
    await expectAsync(saved.save(info, null)).toBeRejected();
    expect(legacy.has(LEGACY_STORAGE_KEY)).toBeTrue();
  });  it('stores a photo larger than the former 5 MB local storage limit', async () => {
    const saved = service();
    const photo = new File([new Uint8Array(6 * 1024 ** 2)], 'large.png', { type: 'image/png' });
    const id = await saved.save({ ...info, photo }, null);
    expect((await service().load(id))?.photo?.size).toBe(photo.size);
  });

  it('updates matching IDs, adds new IDs and leaves other records intact', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    const untouched = await saved.save(info, null);
    const records = [
      { id, info: { ...info, name: 'Imported' }, updatedAt: 42 },
      { id: 'new-cv', info, updatedAt: 43 }
    ];
    await saved.importRecords(records);
    await saved.importRecords(records);
    expect((await saved.snapshot()).length).toBe(3);
    expect(await saved.load(untouched)).toEqual(info);
    expect((await saved.snapshot()).find((record) => record.id === id)).toEqual(records[0]);
    expect(await saved.load('new-cv')).toEqual(info);
    expect(saved.all().length).toBe(3);
  });

  it('rolls back the entire import if a later record fails', async () => {
    const saved = service();
    const id = await saved.save(info, null);
    const original = (await saved.snapshot())[0];
    const add = IDBObjectStore.prototype.put;
    let writes = 0;
    spyOn(IDBObjectStore.prototype, 'put').and.callFake(function (
      this: IDBObjectStore, value: unknown, key?: IDBValidKey
    ) {
      if (++writes === 2) throw new Error('Write failed');
      return add.call(this, value, key);
    });
    await expectAsync(saved.importRecords([{ ...original, info: { ...info, name: 'Lost update' } }, { ...original, id: 'new' }])).toBeRejected();
    expect((await service().snapshot()).length).toBe(1);
    expect(await saved.load(id)).toEqual(info);
    expect(saved.all().length).toBe(1);
  });


  for (const version of [1, 2]) {
    it(`opens an existing version ${version} database without replacing saved data`, async () => {
      const photo = new File(['existing photo'], 'existing.png', {
        type: 'image/png', lastModified: 123
      });
      const existing = { id: 'existing', info: { ...info, photo }, updatedAt: 42 };
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(databaseName, version);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('cvs', { keyPath: 'id' });
          request.result.createObjectStore('metadata');
          request.result.createObjectStore('experiences', { keyPath: 'id' });
        };
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction('cvs', 'readwrite');
          transaction.oncomplete = () => { database.close(); resolve(); };
          transaction.onabort = () => { database.close(); reject(transaction.error); };
          transaction.objectStore('cvs').add(existing);
        };
      });

      const saved = service();
      await saved.refresh();
      expect(saved.error()).toBe('');
      expect(saved.all().map((record) => record.id)).toEqual(['existing']);
      const snapshot = await saved.snapshot();
      expect(snapshot[0].updatedAt).toBe(42);
      const restoredPhoto = (await saved.load('existing'))!.photo!;
      expect(await restoredPhoto.text()).toBe('existing photo');
      expect(restoredPhoto.name).toBe(photo.name);
      expect(restoredPhoto.lastModified).toBe(photo.lastModified);

      await saved.importRecords(snapshot);
      expect(saved.all().length).toBe(1);
      await saved.save({ ...info, name: 'Updated' }, 'existing');
      expect((await saved.load('existing'))?.name).toBe('Updated');
      await saved.delete('existing');
      expect(saved.all().length).toBe(0);

      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          expect(request.result.version).toBe(version + 1);
          expect(request.result.objectStoreNames.contains('technologies')).toBeTrue();
          request.result.close();
          resolve();
        };
      });
    });
  }

  it('deletes technologies persistently without modifying CV or experience snapshots', async () => {
    const saved = service();
    await saved.saveTechnology({ name: 'SDK' });
    const snapshot = { ...info, technologies: ['SDK'] };
    const id = await saved.save(snapshot, null);
    const experience = { ...info.experiences[0], technologies: ['SDK'] };
    await saved.saveExperience(experience);
    await saved.deleteTechnology('sdk');
    expect(saved.technologies()).toEqual([]);
    const reloaded = service();
    await reloaded.loadTechnologies();
    expect(reloaded.technologies()).toEqual([]);
    expect(await saved.load(id)).toEqual(snapshot);
    expect((await saved.listExperiences())[0].experience.technologies).toEqual(['SDK']);
  });

  it('keeps a technology when its delete transaction aborts', async () => {
    const saved = service();
    await saved.saveTechnology({ name: 'SDK' });
    const original = IDBObjectStore.prototype.delete;
    spyOn(IDBObjectStore.prototype, 'delete').and.callFake(function (this: IDBObjectStore, key) {
      const request = original.call(this, key);
      this.transaction.abort();
      return request;
    });
    await expectAsync(saved.deleteTechnology('sdk')).toBeRejected();
    expect(saved.technologies().map((entry) => entry.name)).toEqual(['SDK']);
    expect((await saved.backupSnapshot()).technologies?.length).toBe(1);
  });

  it('persists a technology library, deduplicates names and imports or wipes entries', async () => {
    const saved = service();
    const icon = document.createElement('canvas').toDataURL('image/png');
    await saved.saveTechnology({ name: ' SDK ', icon });
    await saved.saveTechnology({ name: 'sdk', icon });
    const reloaded = service();
    await reloaded.loadTechnologies();
    expect(reloaded.technologies()).toEqual([
      jasmine.objectContaining({ id: 'sdk', name: 'SDK', icon })
    ]);
    const snapshot = await saved.backupSnapshot();
    expect(snapshot.technologies).toEqual(reloaded.technologies());
    await saved.importRecords([], [], false, [{ id: 'tool', name: 'Tool', updatedAt: 1 }]);
    expect(saved.technologies().map((entry) => entry.name)).toEqual(['SDK', 'Tool']);
    await saved.importRecords([], [], true, snapshot.technologies);
    expect(saved.technologies()).toEqual(snapshot.technologies!);
    await saved.importRecords([], [], true);
    expect((await saved.backupSnapshot()).technologies).toEqual([]);
  });


  it('round trips both stores without duplicates and preserves experience links', async () => {
    const saved = service();
    const experienceId = await saved.saveExperience(info.experiences[0]);
    const linked = { ...info.experiences[0], savedExperienceId: experienceId };
    const cvId = await saved.save({ ...info, experiences: [linked, linked] }, null);
    const snapshot = await saved.backupSnapshot();
    const { createArchive, readArchive } = await import('../helpers/cv-archive');
    const archive = await readArchive(await createArchive(snapshot.cvs, snapshot.experiences));
    await saved.saveExperience({ ...linked, company: 'Local change' });
    await saved.importRecords(archive.cvs, archive.experiences);
    await saved.importRecords(archive.cvs, archive.experiences);
    expect(await service().backupSnapshot()).toEqual(snapshot);
    expect((await saved.load(cvId))!.experiences.map((entry) => entry.savedExperienceId))
      .toEqual([experienceId, experienceId]);
    await saved.saveExperience({ ...linked, company: 'Edited imported experience' });
    expect((await saved.listExperiences()).length).toBe(1);
    expect((await saved.listExperiences())[0].experience.company).toBe('Edited imported experience');
  });

  it('preserves experience links in CV-only imports', async () => {
    const saved = service();
    const id = await saved.saveExperience(info.experiences[0]);
    await saved.importRecords([{ id: 'cv', updatedAt: 1,
      info: { ...info, experiences: [{ ...info.experiences[0], savedExperienceId: id }] } }]);
    const snapshot = await saved.backupSnapshot();
    expect(snapshot.cvs[0].info.experiences[0].savedExperienceId).toBe(id);
    expect(snapshot.experiences.length).toBe(1);
    expect(snapshot.experiences[0].id).toBe(id);
  });

  for (const wipe of [false, true]) {
    it(`rolls back both stores on an experience write failure with wipe=${wipe}`, async () => {
      const saved = service();
      await saved.save(info, null);
      await saved.saveExperience(info.experiences[0]);
      const before = await saved.backupSnapshot();
      const put = IDBObjectStore.prototype.put;
      spyOn(IDBObjectStore.prototype, 'put').and.callFake(function (
        this: IDBObjectStore, value: unknown, key?: IDBValidKey
      ) {
        if (this.name === 'experiences') throw new Error('Write failed');
        return put.call(this, value, key);
      });
      const cvs = before.cvs.map((record) => ({ ...record, info: { ...info, name: 'Lost update' } }));
      await expectAsync(saved.importRecords(cvs, before.experiences, wipe)).toBeRejected();
      expect(await service().backupSnapshot()).toEqual(before);
      expect(saved.all()).toEqual(before.cvs);
    });
  }

  it('wipes both stores before importing and supports an empty replacement', async () => {
    const saved = service();
    await saved.save(info, null);
    await saved.saveExperience(info.experiences[0]);
    const cvs = [{ id: 'replacement', info, updatedAt: 42 }];
    const experiences = [{ id: 'replacement-experience', updatedAt: 43,
      experience: { ...info.experiences[0], savedExperienceId: 'replacement-experience' } }];
    await saved.importRecords(cvs, experiences, true);
    expect(await saved.backupSnapshot()).toEqual({ cvs, experiences, technologies: [], folders: [] });
    await saved.importRecords([], [], true);
    expect(await saved.backupSnapshot()).toEqual({ cvs: [], experiences: [], technologies: [], folders: [] });
    expect(saved.all()).toEqual([]);
  });

  it('imports saved experiences without CVs', async () => {
    const saved = service();
    await saved.importRecords([], [{ id: 'source', updatedAt: 42, experience: info.experiences[0] }]);
    const snapshot = await saved.backupSnapshot();
    expect(snapshot.cvs).toEqual([]);
    expect(snapshot.experiences.length).toBe(1);
    expect(snapshot.experiences[0].id).toBe('source');
    expect(snapshot.experiences[0].experience.savedExperienceId).toBe(snapshot.experiences[0].id);
  });

});

