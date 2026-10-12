import { strToU8, unzipSync, zipSync } from 'fflate';
import { createArchive, readArchive } from './cv-archive';
import { defaultBackupName } from '../services/cv-backup';
import { SavedCv } from '../services/saved-cvs';

describe('CV ZIP backups', () => {
  for (const technologiesPosition of ['top', 'bottom'] as const) {
    it(`preserves the ${technologiesPosition} used technologies position`, async () => {
      const saved = { ...record, info: { ...record.info,
        structure: { sidebarPosition: 'right' as const, technologiesView: 'blocks' as const, technologiesPosition }
      } };
      const restored = await readArchive(await createArchive([saved]));
      expect(restored.cvs[0].info.structure?.technologiesPosition).toBe(technologiesPosition);
    });
  }

  it('rejects invalid used technologies positions', async () => {
    await expectAsync(readArchive(archive([{ ...record, info: { ...record.info, photo: null,
      structure: { ...record.info.structure, technologiesPosition: 'middle' }
    } }]))).toBeRejected();
  });
  it('round trips a standalone technology library with optional icons', async () => {
    const technologies = [
      { id: 'sdk', name: 'SDK', icon: document.createElement('canvas').toDataURL('image/png'), updatedAt: 1 },
      { id: 'tool', name: 'Tool', updatedAt: 2 }
    ];
    expect(await readArchive(await createArchive([], [], technologies)))
      .toEqual({ cvs: [], experiences: [], technologies });
  });

  it('rejects invalid technology identities, duplicate entries and remote icons', async () => {
    const entry = { id: 'sdk', name: 'SDK', updatedAt: 1 };
    for (const technologies of [
      [{ ...entry, id: 'wrong' }], [entry, entry],
      [{ ...entry, icon: 'https://example.com/icon.png' }]
    ]) {
      await expectAsync(readArchive(archive([], 3, {
        'experiences.json': strToU8('[]'),
        'technologies.json': strToU8(JSON.stringify(technologies))
      }))).toBeRejected();
    }
  });
  it('round trips custom icons on CVs and saved experiences and rejects remote icon URLs', async () => {
    const customTechnologyIcons = { SDK: document.createElement('canvas').toDataURL('image/png') };
    const experience = { ...record.info.experiences[0], technologies: ['SDK'], customTechnologyIcons };
    const cv = { ...record, info: { ...record.info, customTechnologyIcons, experiences: [experience] } };
    const saved = { id: 'custom-experience', updatedAt: 1, experience };
    const restored = await readArchive(await createArchive([cv], [saved]));
    expect(restored.cvs[0].info.customTechnologyIcons).toEqual(customTechnologyIcons);
    expect(restored.cvs[0].info.experiences[0].customTechnologyIcons).toEqual(customTechnologyIcons);
    expect(restored.experiences[0].experience.customTechnologyIcons).toEqual(customTechnologyIcons);
    await expectAsync(readArchive(await createArchive([{ ...cv, info: { ...cv.info,
      customTechnologyIcons: { SDK: 'https://example.com/icon.png' }
    } }]))).toBeRejectedWithError(/valid/);
  });
  const record: SavedCv = {
    id: 'saved-id', updatedAt: 123456,
    info: {
      name: 'Ada — Ада', positionTitle: 'Engineer', description: 'Builds things',
      photo: new File([new Uint8Array([0, 128, 255, 42])], 'portrait.png', {
        type: 'image/png', lastModified: 123
      }),
      languages: [{ language: 'English', level: 'Native' }], technologies: ['Angular'],
      experiences: [{ company: 'Example', position: 'Developer', startDate: '2020',
        endDate: '', isCurrent: true, technologies: ['TypeScript'], description: '<p>Projects</p>' }],
      structure: { photoSizeMm: 52, showPhoto: false, theme: 'dark-blue', sidebarPosition: 'left',
        technologiesView: 'comma-separated', sidebarTechnologiesView: 'blocks' }
    }
  };

  const archive = (data: unknown, version = 1, extra: Record<string, Uint8Array> = {}) =>
    new Blob([new Uint8Array(zipSync({
      'manifest.json': strToU8(JSON.stringify({ format: 'cv-builder', schemaVersion: version })),
      'cvs.json': strToU8(JSON.stringify(data)), ...extra
    }))]);

  it('round trips every CV field and original photo bytes and metadata', async () => {
    const blob = await createArchive([record]);
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(files).sort()).toEqual(['cvs.json', 'experiences.json', 'manifest.json', 'photos/0.png', 'technologies.json']);
    const { cvs: [restored] } = await readArchive(blob);
    expect({ ...restored, info: { ...restored.info, photo: null } })
      .toEqual({ ...record, info: { ...record.info, photo: null } });
    expect(restored.info.photo!.name).toBe('portrait.png');
    expect(restored.info.photo!.lastModified).toBe(123);
    expect(restored.info.photo!.type).toBe('image/png');
    expect(await restored.info.photo!.arrayBuffer()).toEqual(await record.info.photo!.arrayBuffer());
  });

  it('supports empty databases and CVs without photos or optional structure', async () => {
    expect(await readArchive(await createArchive([]))).toEqual({ cvs: [], experiences: [], technologies: [] });
    const { structure, ...info } = record.info;
    const plain = { ...record, info: { ...info, photo: null } };
    expect(await readArchive(await createArchive([plain]))).toEqual({ cvs: [plain], experiences: [], technologies: [] });
  });

  it('handles asynchronous decompression of larger content', async () => {
    const large = { ...record, info: { ...record.info, photo: null, description: 'content '.repeat(60000) } };
    expect(await readArchive(await createArchive([large]))).toEqual({ cvs: [large], experiences: [], technologies: [] });
  });

  it('rejects unsupported versions, malformed ZIPs and invalid nested fields', async () => {
    await expectAsync(readArchive(archive([], 4))).toBeRejectedWithError(/version/);
    await expectAsync(readArchive(new Blob(['not a zip']))).toBeRejectedWithError();
    await expectAsync(readArchive(archive([{ ...record,
      info: { ...record.info, photo: null, experiences: [{ isCurrent: 'yes' }] }
    }]))).toBeRejectedWithError();
  });

  it('rejects missing photos, duplicate IDs and unexpected paths', async () => {
    await expectAsync(readArchive(archive([{ ...record, info: { ...record.info, photo: {
      path: 'photos/0.png', name: 'portrait.png', type: 'image/png', lastModified: 123
    } } }]))).toBeRejectedWithError();
    const plain = { ...record, info: { ...record.info, photo: null } };
    await expectAsync(readArchive(archive([plain, plain]))).toBeRejectedWithError();
    await expectAsync(readArchive(archive([], 1, { '../outside': new Uint8Array() }))).toBeRejectedWithError();
  });

  it('rejects excessive CV counts and excessive expanded JSON', async () => {
    await expectAsync(readArchive(archive(Array.from({ length: 1001 }, (_, index) => ({
      ...record, id: String(index), info: { ...record.info, photo: null }
    }))))).toBeRejectedWithError(/1,000/);
    await expectAsync(readArchive(archive([], 1, {
      'cvs.json': strToU8(' '.repeat(10 * 1024 ** 2 + 1))
    }))).toBeRejectedWithError();
  });

  it('uses the local calendar date and pads day and month', () => {
    expect(defaultBackupName(new Date(2026, 0, 2))).toBe('cv-builder-02.01.2026');
  });

  it('round trips saved experiences and the CV links to them, including experiences-only backups', async () => {
    const experience = { ...record.info.experiences[0], savedExperienceId: 'experience-id' };
    const saved = { id: 'experience-id', updatedAt: 987, experience };
    const linked = { ...record, info: { ...record.info, photo: null, experiences: [experience] } };
    expect(await readArchive(await createArchive([linked], [saved])))
      .toEqual({ cvs: [linked], experiences: [saved], technologies: [] });
    expect(await readArchive(await createArchive([], [saved])))
      .toEqual({ cvs: [], experiences: [saved], technologies: [] });
  });

  it('continues to read version 1 CV-only archives', async () => {
    const plain = { ...record, info: { ...record.info, photo: null } };
    expect(await readArchive(archive([plain])))
      .toEqual({ cvs: [plain], experiences: [], technologies: [] });
  });

  it('rejects incomplete version 2 backups and invalid saved experiences', async () => {
    await expectAsync(readArchive(archive([], 2))).toBeRejectedWithError();
    const saved = { id: 'experience-id', updatedAt: 1, experience: record.info.experiences[0] };
    for (const data of [
      [saved, saved],
      [{ ...saved, updatedAt: 'invalid' }],
      [{ ...saved, experience: { ...saved.experience, isCurrent: 'yes' } }],
      [{ ...saved, experience: { ...saved.experience, savedExperienceId: 'wrong-id' } }]
    ]) {
      await expectAsync(readArchive(archive([], 2, {
        'experiences.json': strToU8(JSON.stringify(data))
      }))).toBeRejectedWithError();
    }
    await expectAsync(readArchive(archive([], 2, {
      'experiences.json': strToU8(JSON.stringify(Array.from({ length: 1001 }, (_, index) =>
        ({ ...saved, id: String(index) }))))
    }))).toBeRejectedWithError(/1,000/);
  });

});
