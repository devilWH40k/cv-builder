import { AsyncUnzipInflate, strFromU8, strToU8, Unzip, zip } from 'fflate';
import type { AsyncZippable, UnzipFile } from 'fflate';
import type { CvInfo, CvStructure } from '../services/cv-draft';
import type { CvExperience, SavedExperience } from '../interfaces/experience';
import type { CvDatabaseSnapshot, SavedCv } from '../services/saved-cvs';
import { CV_THEMES } from '../constants/cv-themes';
import { CustomEntryIcons } from '../../../core/dialogs/custom-entry-dialog/custom-entry-icon';
import { SavedTechnology, technologyId } from './saved-technology';

const MAX_BYTES = 100 * 1024 ** 2;
const MAX_CVS = 1000;
const MAX_EXPERIENCES = 1000;
const MAX_TECHNOLOGIES = 1000;
const MAX_JSON_BYTES = 10 * 1024 ** 2;
const INVALID = 'This is not a valid CV Builder backup.';
const TOO_LARGE = 'Backups must contain at most 1,000 CVs, 1,000 saved experiences, 1,000 technologies and 100 MB of data.';

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(INVALID);
  return value as Record<string, unknown>;
}

function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error(INVALID);
  return value;
}

function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(INVALID);
  return value;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error(INVALID);
  return value;
}

function experience(value: unknown): CvExperience {
  const entry = object(value);
  const isCurrent = entry['isCurrent'];
  const savedExperienceId = entry['savedExperienceId'];
  if (typeof isCurrent !== 'boolean' ||
    (savedExperienceId !== undefined && savedExperienceId !== null &&
      (typeof savedExperienceId !== 'string' || !savedExperienceId))) throw new Error(INVALID);
  return {
    company: string(entry['company']), position: string(entry['position']),
    startDate: string(entry['startDate']), endDate: string(entry['endDate']),
    description: string(entry['description']), isCurrent,
    technologies: array(entry['technologies']).map(string),
    ...customIcons(entry['customTechnologyIcons']),
    ...(savedExperienceId !== undefined ? { savedExperienceId } : {})
  };
}

function customIcons(value: unknown): { customTechnologyIcons?: CustomEntryIcons } {
  if (value === undefined) return {};
  const entries = Object.entries(object(value)).map(([name, source]) => {
    const icon = string(source);
    if (!name.trim() || icon.length > 100000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(icon)) {
      throw new Error(INVALID);
    }
    return [name, icon];
  });
  return { customTechnologyIcons: Object.fromEntries(entries) };
}

function structure(value: unknown): CvStructure | undefined {
  if (value === undefined) return undefined;
  const settings = object(value);
  const sidebarPosition = settings['sidebarPosition'];
  const technologiesView = settings['technologiesView'];
  const sidebarTechnologiesView = settings['sidebarTechnologiesView'];
  const theme = CV_THEMES.find((theme) => theme.value === settings['theme'])?.value;
  if ((settings['theme'] !== undefined && !theme) ||
    (sidebarPosition !== 'left' && sidebarPosition !== 'right') ||
    (technologiesView !== 'blocks' && technologiesView !== 'comma-separated') ||
    (sidebarTechnologiesView !== undefined && sidebarTechnologiesView !== 'blocks' &&
      sidebarTechnologiesView !== 'list')) throw new Error(INVALID);
  const showPhoto = settings['showPhoto'];
  const photoSizeMm = settings['photoSizeMm'];
  if (showPhoto !== undefined && typeof showPhoto !== 'boolean') throw new Error(INVALID);
  if (photoSizeMm !== undefined && (typeof photoSizeMm !== 'number' ||
    !Number.isFinite(photoSizeMm) || photoSizeMm <= 0)) throw new Error(INVALID);
  return {
    sidebarPosition, technologiesView,
    ...(showPhoto !== undefined ? { showPhoto } : {}),
    ...(photoSizeMm !== undefined ? { photoSizeMm } : {}),
    ...(theme ? { theme } : {}),
    ...(sidebarTechnologiesView ? { sidebarTechnologiesView } : {})
  };
}

export async function createArchive(
  records: readonly SavedCv[], experiences: readonly SavedExperience[] = [], technologies: readonly SavedTechnology[] = []
): Promise<Blob> {
  if (records.length > MAX_CVS || experiences.length > MAX_EXPERIENCES || technologies.length > MAX_TECHNOLOGIES) throw new Error(TOO_LARGE);
  const entries: AsyncZippable = Object.create(null);
  const cvs = [];
  let size = 0;
  for (const [index, record] of records.entries()) {
    const photo = record.info.photo;
    const path = `photos/${index}.${photo?.type === 'image/jpeg' ? 'jpg' : 'png'}`;
    if (photo) {
      size += photo.size;
      if (size > MAX_BYTES) throw new Error(TOO_LARGE);
      entries[path] = [new Uint8Array(await photo.arrayBuffer()), { level: 0 }];
    }
    cvs.push({
      ...record, info: {
        ...record.info, photo: photo ? {
          path, name: photo.name, type: photo.type, lastModified: photo.lastModified
        } : null
      }
    });
  }
  const manifest = strToU8(JSON.stringify({
    format: 'cv-builder', schemaVersion: 3, exportedAt: new Date().toISOString()
  }));
  const data = strToU8(JSON.stringify(cvs));
  const experienceData = strToU8(JSON.stringify(experiences));
  const technologyData = strToU8(JSON.stringify(technologies));
  if (data.length > MAX_JSON_BYTES || experienceData.length > MAX_JSON_BYTES || technologyData.length > MAX_JSON_BYTES ||
    size + data.length + experienceData.length + technologyData.length + manifest.length > MAX_BYTES) {
    throw new Error(TOO_LARGE);
  }
  entries['manifest.json'] = manifest;
  entries['cvs.json'] = data;
  entries['experiences.json'] = experienceData;
  entries['technologies.json'] = technologyData;
  return new Promise((resolve, reject) => {
    zip(entries, { level: 6 }, (error, bytes) => {
      if (error) reject(new Error('Could not create the backup. Please try again.'));
      else if (bytes.length > MAX_BYTES) reject(new Error(TOO_LARGE));
      else resolve(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }));
    });
  });
}

async function extractArchive(file: Blob): Promise<Map<string, Uint8Array>> {
  if (file.size > MAX_BYTES) throw new Error(TOO_LARGE);
  return new Promise((resolve, reject) => {
    const entries = new Map<string, Uint8Array>();
    const names = new Set<string>();
    const active = new Set<UnzipFile>();
    let total = 0;
    let finished = false;
    let failed = false;
    const fail = (error: Error) => {
      failed = true;
      for (const entry of active) entry.terminate();
      reject(error);
    };
    const complete = () => { if (finished && active.size === 0 && !failed) resolve(entries); };
    const unzip = new Unzip((entry) => {
      if (failed) return;
      if (names.has(entry.name) || !/^(manifest\.json|cvs\.json|experiences\.json|technologies\.json|photos\/\d+\.(png|jpg))$/.test(entry.name)) {
        fail(new Error(INVALID));
        return;
      }
      names.add(entry.name);
      const limit = entry.name.endsWith('.json') ? MAX_JSON_BYTES : MAX_BYTES;
      if (names.size > MAX_CVS + 4 || (entry.originalSize ?? 0) > limit) {
        fail(new Error(TOO_LARGE));
        return;
      }
      active.add(entry);
      const chunks: Uint8Array[] = [];
      let size = 0;
      entry.ondata = (error, chunk, final) => {
        if (failed) return;
        if (error) { fail(new Error(INVALID)); return; }
        size += chunk.length;
        total += chunk.length;
        if (size > limit || total > MAX_BYTES) { fail(new Error(TOO_LARGE)); return; }
        chunks.push(chunk);
        if (final) {
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const part of chunks) { bytes.set(part, offset); offset += part.length; }
          entries.set(entry.name, bytes);
          active.delete(entry);
          complete();
        }
      };
      entry.start();
    });
    unzip.register(AsyncUnzipInflate);
    void (async () => {
      try {
        for (let offset = 0; offset < file.size && !failed; offset += 65536) {
          unzip.push(new Uint8Array(await file.slice(offset, offset + 65536).arrayBuffer()));
        }
        if (failed) return;
        unzip.push(new Uint8Array(), true);
        finished = true;
        complete();
      } catch { fail(new Error(INVALID)); }
    })();
  });
}

export async function readArchive(file: Blob): Promise<CvDatabaseSnapshot> {
  const entries = await extractArchive(file);
  const json = (name: string): unknown => {
    const bytes = entries.get(name);
    if (!bytes) throw new Error(INVALID);
    try { return JSON.parse(strFromU8(bytes)); } catch { throw new Error(INVALID); }
  };
  const manifest = object(json('manifest.json'));
  if (manifest['format'] !== 'cv-builder') throw new Error(INVALID);
  const version = manifest['schemaVersion'];
  if (version !== 1 && version !== 2 && version !== 3) throw new Error('This backup version is not supported.');
  const savedExperiences = version >= 2 ? array(json('experiences.json')) : [];
  const savedTechnologies = version === 3 ? array(json('technologies.json')) : [];
  if (savedTechnologies.length > MAX_TECHNOLOGIES) throw new Error(TOO_LARGE);
  const technologyIds = new Set<string>();
  const technologies = savedTechnologies.map((value): SavedTechnology => {
    const entry = object(value);
    const name = string(entry['name']);
    const id = string(entry['id']);
    if (!name.trim() || name !== name.trim() || id !== technologyId(name) || technologyIds.has(id)) throw new Error(INVALID);
    technologyIds.add(id);
    const icon = entry['icon'];
    if (icon !== undefined) customIcons({ [name]: icon });
    return { id, name, updatedAt: number(entry['updatedAt']), ...(icon !== undefined ? { icon: string(icon) } : {}) };
  });
  if (savedExperiences.length > MAX_EXPERIENCES) throw new Error(TOO_LARGE);
  const experienceIds = new Set<string>();
  const experiences = savedExperiences.map((value): SavedExperience => {
    const record = object(value);
    const id = string(record['id']);
    if (!id || experienceIds.has(id)) throw new Error(INVALID);
    experienceIds.add(id);
    const restored = experience(record['experience']);
    if (restored.savedExperienceId != null && restored.savedExperienceId !== id) throw new Error(INVALID);
    return { id, updatedAt: number(record['updatedAt']), experience: restored };
  });
  const cvs = array(json('cvs.json'));
  if (cvs.length > MAX_CVS) throw new Error(TOO_LARGE);
  const ids = new Set<string>();
  const records = cvs.map((value) => {
    const record = object(value);
    const id = string(record['id']);
    if (!id || ids.has(id)) throw new Error(INVALID);
    ids.add(id);
    const info = object(record['info']);
    let photo: File | null = null;
    if (info['photo'] !== null) {
      const stored = object(info['photo']);
      const path = string(stored['path']);
      const bytes = entries.get(path);
      const type = string(stored['type']);
      if (!/^photos\/\d+\.(png|jpg)$/.test(path) || !bytes ||
        !['image/png', 'image/jpeg'].includes(type)) throw new Error(INVALID);
      photo = new File([new Uint8Array(bytes)], string(stored['name']), {
        type, lastModified: number(stored['lastModified'])
      });
    }
    const layout = structure(info['structure']);
    const restored: CvInfo = {
      name: string(info['name']), positionTitle: string(info['positionTitle']),
      description: string(info['description']), photo,
      technologies: array(info['technologies']).map(string),
      ...customIcons(info['customTechnologyIcons']),
      languages: array(info['languages']).map((value) => {
        const language = object(value);
        return { language: string(language['language']), level: string(language['level']) };
      }),
      experiences: array(info['experiences']).map(experience),
      ...(layout ? { structure: layout } : {})
    };
    return { id, updatedAt: number(record['updatedAt']), info: restored };
  });
  return { cvs: records, experiences, technologies };
}
