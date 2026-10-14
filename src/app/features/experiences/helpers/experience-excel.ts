import { AsyncUnzipInflate, strFromU8, strToU8, Unzip, zipSync } from 'fflate';
import type { UnzipFile } from 'fflate';
import { CvExperience } from '../../cv/interfaces/experience';
import { EXPERIENCE_COLUMNS } from '../experience-columns';

export interface ExperienceImportMessage {
  readonly type: 'success' | 'error';
  readonly message: string;
}

export interface ExperienceImportResult {
  readonly experiences: readonly CvExperience[];
  readonly report: readonly ExperienceImportMessage[];
}

const MAX_FILE_BYTES = 10 * 1024 ** 2;
const MAX_XML_BYTES = 10 * 1024 ** 2;
const MAX_TOTAL_BYTES = 25 * 1024 ** 2;
const MAX_RECORDS = 1000;
const RELATIONSHIPS_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const SPREADSHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function extractWorkbook(file: File): Promise<Map<string, Uint8Array>> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Choose an .xlsx Excel file.');
  if (file.size > MAX_FILE_BYTES) throw new Error('The Excel file must be no larger than 10 MB.');
  if (!file.size) throw new Error('The selected file is empty.');
  return new Promise((resolve, reject) => {
    const entries = new Map<string, Uint8Array>();
    const names = new Set<string>();
    const active = new Set<UnzipFile>();
    let total = 0;
    let finished = false;
    let failed = false;
    const fail = (reason: string) => {
      if (failed) return;
      failed = true;
      for (const entry of active) entry.terminate();
      reject(new Error(reason));
    };
    const complete = () => { if (finished && !active.size && !failed) resolve(entries); };
    const unzip = new Unzip((entry) => {
      if (failed) return;
      if (names.has(entry.name)) { fail('The workbook contains duplicate archive entries.'); return; }
      names.add(entry.name);
      if (names.size > 2000) { fail('The workbook contains too many archive entries.'); return; }
      if (!/\.(xml|rels)$/i.test(entry.name)) return;
      if ((entry.originalSize ?? 0) > MAX_XML_BYTES) {
        fail('A workbook XML part exceeds the 10 MB limit.'); return;
      }
      active.add(entry);
      const chunks: Uint8Array[] = [];
      let size = 0;
      entry.ondata = (error, chunk, final) => {
        if (failed) return;
        if (error) { fail('The workbook is damaged or could not be decompressed.'); return; }
        size += chunk.length;
        total += chunk.length;
        if (size > MAX_XML_BYTES || total > MAX_TOTAL_BYTES) {
          fail('The workbook contains too much uncompressed XML data.'); return;
        }
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
      } catch { fail('The file is not a readable .xlsx workbook. It may be damaged or encrypted.'); }
    })();
  });
}

function elements(parent: Document | Element, name: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS('*', name));
}

function children(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter((child) => child.localName === name);
}

function xml(entries: Map<string, Uint8Array>, path: string, root: string): Document {
  const bytes = entries.get(path);
  if (!bytes) throw new Error(`The workbook is missing ${path}.`);
  const source = strFromU8(bytes);
  if (/<!DOCTYPE/i.test(source)) throw new Error(`${path} contains an unsupported document type declaration.`);
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (elements(document, 'parsererror').length || document.documentElement.localName !== root) {
    throw new Error(`The XML structure in ${path} is invalid.`);
  }
  return document;
}

function targetPath(base: string, target: string): string {
  if (!target || /[\\?#]/.test(target) || /^[a-z]+:/i.test(target)) {
    throw new Error('The workbook contains an invalid internal relationship.');
  }
  const path = target.startsWith('/') ? target.slice(1) : base.slice(0, base.lastIndexOf('/') + 1) + target;
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!parts.length) throw new Error('The workbook contains an invalid internal path.');
      parts.pop();
    } else parts.push(part);
  }
  return parts.join('/');
}

function relationshipsPath(part: string): string {
  const split = part.lastIndexOf('/') + 1;
  return part.slice(0, split) + '_rels/' + part.slice(split) + '.rels';
}

function stringText(element: Element): string {
  return Array.from(element.children).filter((child) => child.localName === 't' || child.localName === 'r')
    .map((child) => child.localName === 't' ? child.textContent ?? ''
      : children(child, 't').map((text) => text.textContent ?? '').join('')).join('');
}

function cellText(cell: Element, strings: readonly string[]): string {
  if (children(cell, 'f').length) throw new Error('formulas are not supported; replace the formula with a value');
  const type = cell.getAttribute('t');
  const value = children(cell, 'v')[0]?.textContent ?? '';
  if (type === 'e') throw new Error(`Excel cell error ${value || '(unknown)'}`);
  if (type === 'inlineStr') return children(cell, 'is').map(stringText).join('');
  if (type === 's') {
    if (!/^\d+$/.test(value) || strings[Number(value)] === undefined) {
      throw new Error('the cell references a missing shared string');
    }
    return strings[Number(value)];
  }
  if (type === 'b') {
    if (value !== '0' && value !== '1') throw new Error('invalid Excel boolean value');
    return value === '1' ? 'true' : 'false';
  }
  return value;
}

interface WorkbookRow {
  readonly number: number;
  readonly cells: ReadonlyMap<number, Element>;
}

function worksheetRows(sheet: Document): WorkbookRow[] {
  const data = children(sheet.documentElement, 'sheetData')[0];
  if (!data) throw new Error('The worksheet has no cell table (sheetData).');
  const rows = children(data, 'row');
  if (rows.length > 10000) throw new Error('The worksheet contains too many rows.');
  const seen = new Set<number>();
  return rows.map((row, index) => {
    const rowNumber = Number(row.getAttribute('r') ?? index + 1);
    if (!Number.isSafeInteger(rowNumber) || rowNumber < 1 || seen.has(rowNumber)) {
      throw new Error('The worksheet has invalid or duplicate row numbers.');
    }
    seen.add(rowNumber);
    const cells = new Map<number, Element>();
    let nextColumn = 0;
    for (const cell of children(row, 'c')) {
      const reference = cell.getAttribute('r');
      let column = nextColumn;
      if (reference) {
        const match = /^([A-Z]{1,3})([1-9]\d*)$/i.exec(reference);
        if (!match || Number(match[2]) !== rowNumber) throw new Error(`Invalid cell address in worksheet row ${rowNumber}.`);
        column = Array.from(match[1].toUpperCase()).reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;
      }
      if (column > 16383 || cells.has(column)) throw new Error(`Invalid or duplicate cell in worksheet row ${rowNumber}.`);
      cells.set(column, cell);
      nextColumn = column + 1;
    }
    return { number: rowNumber, cells };
  }).sort((a, b) => a.number - b.number);
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function descriptionHtml(text: string): string {
  return text ? text.split(/\r\n|\r|\n/).map((line) => `<p>${line ? escapeXml(line) : '<br>'}</p>`).join('') : '';
}

function validLink(value: string): boolean {
  if (!value) return true;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}

export async function readExperienceExcel(file: File): Promise<ExperienceImportResult> {
  const entries = await extractWorkbook(file);
  xml(entries, '[Content_Types].xml', 'Types');
  const packageRelations = elements(xml(entries, '_rels/.rels', 'Relationships'), 'Relationship');
  const officeDocument = packageRelations.find((entry) => entry.getAttribute('Type')?.endsWith('/officeDocument'));
  if (!officeDocument || officeDocument.getAttribute('TargetMode') === 'External') {
    throw new Error('The file has no internal Excel workbook relationship.');
  }
  const workbookPath = targetPath('', officeDocument.getAttribute('Target') ?? '');
  const workbook = xml(entries, workbookPath, 'workbook');
  const relations = elements(xml(entries, relationshipsPath(workbookPath), 'Relationships'), 'Relationship');
  const sheet = elements(workbook, 'sheet')[0];
  const relationshipId = sheet?.getAttributeNS(RELATIONSHIPS_NS, 'id') ?? sheet?.getAttribute('r:id');
  const relation = relations.find((entry) => entry.getAttribute('Id') === relationshipId);
  if (!relation?.getAttribute('Type')?.endsWith('/worksheet') || relation.getAttribute('TargetMode') === 'External') {
    throw new Error('The first sheet is missing or is not a readable worksheet.');
  }
  const sheetPath = targetPath(workbookPath, relation.getAttribute('Target') ?? '');
  const sharedRelation = relations.find((entry) => entry.getAttribute('Type')?.endsWith('/sharedStrings'));
  if (sharedRelation?.getAttribute('TargetMode') === 'External') throw new Error('External shared strings are not supported.');
  const strings = sharedRelation
    ? elements(xml(entries, targetPath(workbookPath, sharedRelation.getAttribute('Target') ?? ''), 'sst'), 'si').map(stringText)
    : [];
  const worksheet = xml(entries, sheetPath, 'worksheet');
  const rows = worksheetRows(worksheet);
  const links = new Map<string, string>();
  const sheetRelationsPath = relationshipsPath(sheetPath);
  if (entries.has(sheetRelationsPath)) {
    const sheetRelations = elements(xml(entries, sheetRelationsPath, 'Relationships'), 'Relationship');
    for (const link of elements(worksheet, 'hyperlink')) {
      const id = link.getAttributeNS(RELATIONSHIPS_NS, 'id') ?? link.getAttribute('r:id');
      const relationship = sheetRelations.find((entry) => entry.getAttribute('Id') === id
        && entry.getAttribute('Type')?.endsWith('/hyperlink'));
      if (relationship?.getAttribute('TargetMode') === 'External') {
        links.set(link.getAttribute('ref') ?? '', relationship.getAttribute('Target') ?? '');
      }
    }
  }
  const headerIndex = rows.findIndex((row) => [...row.cells.values()].some((cell) => cellText(cell, strings).trim()));
  if (headerIndex < 0) throw new Error('The worksheet is empty and has no column headers.');
  const header = rows[headerIndex];
  type Column = (typeof EXPERIENCE_COLUMNS)[number];
  const columns = new Map<number, Column>();
  const seenHeaders = new Set<string>();
  const issues: string[] = [];
  for (const [index, cell] of header.cells) {
    const name = cellText(cell, strings).trim().replace(/\s+/g, ' ').toLowerCase();
    if (!name) continue;
    const column = EXPERIENCE_COLUMNS.find((column) => column.label.toLowerCase() === name);
    if (!column) { issues.push(`Unknown column header "${cellText(cell, strings).trim()}"`); continue; }
    if (seenHeaders.has(column.key)) issues.push(`Duplicate column header "${column.label}"`);
    seenHeaders.add(column.key);
    columns.set(index, column);
  }
  if (!seenHeaders.has('company')) issues.push('The Project Name column is required');
  if (issues.length) throw new Error(`Invalid worksheet structure: ${issues.join('; ')}. Download the template for the expected columns.`);

  const experiences: CvExperience[] = [];
  const report: ExperienceImportMessage[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const values = new Map<Column['key'], string>();
    const rowIssues: string[] = [];
    for (const [index, column] of columns) {
      const cell = row.cells.get(index);
      if (!cell) continue;
      try {
        const text = cellText(cell, strings).trim();
        const link = links.get(cell.getAttribute('r') ?? '');
        values.set(column.key, (column.key === 'webLink' || column.key === 'photos') && link !== undefined ? link.trim() : text);
      }
      catch (error: unknown) { rowIssues.push(`${column.label}: ${error instanceof Error ? error.message : 'unreadable cell'}`); }
    }
    // Values in columns without a header never contribute to a record or its validation.
    if (!rowIssues.length && ![...values.values()].some(Boolean)) continue;
    if (report.length >= MAX_RECORDS) throw new Error('Import at most 1,000 experience records at a time.');
    const company = values.get('company') ?? '';
    const webLink = values.get('webLink') ?? '';
    const photos = values.get('photos') ?? '';
    if (!company) rowIssues.push('Project Name is required');
    if (!validLink(webLink)) rowIssues.push('Web link must be a valid http or https URL');
    if (!validLink(photos)) rowIssues.push('Photos must be a valid http or https URL');
    const updated = (values.get('isUpdated') ?? '').toLowerCase();
    const positive = ['yes', 'true', '1', 'да', 'так'];
    const negative = ['no', 'false', '0', 'нет', 'ні'];
    if (updated && !positive.includes(updated) && !negative.includes(updated)) {
      rowIssues.push('Is Updated must be Yes/No, true/false, 1/0, or blank');
    }
    const number = row.number - header.number;
    if (rowIssues.length) {
      report.push({ type: 'error', message: `Record ${number} had following issues: ${rowIssues.join('; ')}.` });
      continue;
    }
    const technologies = [...new Set((values.get('technologies') ?? '').split(/[,;\r\n]+/).map((name) => name.trim()).filter(Boolean))];
    experiences.push({
      company, alternativeNames: values.get('alternativeNames') ?? '', webLink, photos,
      description: descriptionHtml(values.get('description') ?? ''),
      responsibilities: values.get('responsibilities') ?? '', technologies,
      teamlead: values.get('teamlead') ?? '', developer: values.get('developer') ?? '',
      isUpdated: updated ? positive.includes(updated) : null,
      position: '', startDate: '', endDate: '', isCurrent: false
    });
    report.push({ type: 'success', message: `Record ${number} is successfully parsed.` });
  }
  if (!report.length) report.push({ type: 'error', message: 'No experience records were found below the headers.' });
  return { experiences, report };
}

export function createExperienceTemplate(): Blob {
  const xmlPrefix = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const relationshipsNs = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const cells = EXPERIENCE_COLUMNS.map((column, index) => `<c r="${String.fromCharCode(65 + index)}1" t="inlineStr" s="1"><is><t>${escapeXml(column.label)}</t></is></c>`).join('');
  const parts: Record<string, string> = {
    '[Content_Types].xml': `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `<Relationships xmlns="${relationshipsNs}"><Relationship Id="rId1" Type="${RELATIONSHIPS_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<workbook xmlns="${SPREADSHEET_NS}" xmlns:r="${RELATIONSHIPS_NS}"><bookViews><workbookView/></bookViews><sheets><sheet name="Experiences" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="${relationshipsNs}"><Relationship Id="rId1" Type="${RELATIONSHIPS_NS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${RELATIONSHIPS_NS}/styles" Target="styles.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': `<worksheet xmlns="${SPREADSHEET_NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="4" width="24" customWidth="1"/><col min="5" max="7" width="45" customWidth="1"/><col min="8" max="10" width="24" customWidth="1"/></cols><sheetData><row r="1" ht="30" customHeight="1">${cells}</row></sheetData><autoFilter ref="A1:J1001"/><dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="J2:J1001"><formula1>"Yes,No"</formula1></dataValidation></dataValidations></worksheet>`,
    'xl/styles.xml': `<styleSheet xmlns="${SPREADSHEET_NS}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
  };
  const bytes = zipSync(Object.fromEntries(Object.entries(parts).map(([name, content]) => [name, strToU8(xmlPrefix + content)])), { level: 6 });
  return new Blob([new Uint8Array(bytes)], { type: MIME });
}
