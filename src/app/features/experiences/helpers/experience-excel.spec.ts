import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { createExperienceTemplate, readExperienceExcel } from './experience-excel';
import { EXPERIENCE_COLUMNS } from '../experience-columns';

const namespace = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const relationships = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textCell = (address: string, text: string) => `<c r="${address}" t="inlineStr"><is><t xml:space="preserve">${escape(text)}</t></is></c>`;
const headers = EXPERIENCE_COLUMNS.map((column, index) => textCell(`${String.fromCharCode(66 + index)}1`, column.label)).join('');

function workbook(sheetData: string, options: { headers?: string; extra?: Record<string, string> } = {}): File {
  const parts = {
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    '_rels/.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="office" Type="${relationships}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<workbook xmlns="${namespace}" xmlns:r="${relationships}"><sheets><sheet name="Projects" sheetId="1" r:id="projects"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="projects" Type="${relationships}/worksheet" Target="worksheets/projects.xml"/></Relationships>`,
    'xl/worksheets/projects.xml': `<worksheet xmlns="${namespace}"><sheetData><row r="1">${options.headers ?? headers}</row>${sheetData}</sheetData></worksheet>`,
    ...options.extra
  };
  return new File([new Uint8Array(zipSync(Object.fromEntries(Object.entries(parts).map(([path, text]) => [path, strToU8(text)]))))], 'projects.xlsx');
}

describe('Experience Excel parsing', () => {
  it('imports mapped fields, ignores empty headers, and escapes description text', async () => {
    const row = `<row r="2"><c r="A2" t="e"><v>#VALUE!</v></c>` +
      textCell('B2', 'Replique') + textCell('C2', 'Modelize') + textCell('D2', 'https://replique.io/') +
      textCell('E2', 'https://example.com/photos') + textCell('F2', 'CRM <script>alert(1)</script>\nSecond line') +
      textCell('G2', 'Build the frontend\nIntegrate APIs') + textCell('H2', ' Angular, TypeScript, Angular, RxJS ') +
      textCell('I2', 'Lead') + textCell('J2', 'Developer') + textCell('K2', 'Yes') + '</row>';
    const parsed = await readExperienceExcel(workbook(row, { headers: textCell('A1', '   ') + headers }));
    expect(parsed.experiences).toEqual([{
      company: 'Replique', alternativeNames: 'Modelize', webLink: 'https://replique.io/', photos: 'https://example.com/photos',
      description: '<p>CRM &lt;script&gt;alert(1)&lt;/script&gt;</p><p>Second line</p>',
      responsibilities: 'Build the frontend\nIntegrate APIs', technologies: ['Angular', 'TypeScript', 'RxJS'],
      teamlead: 'Lead', developer: 'Developer', isUpdated: true, position: '', startDate: '', endDate: '', isCurrent: false
    }]);
    expect(parsed.report).toEqual([{ type: 'success', message: 'Record 1 is successfully parsed.' }]);
  });

  it('reports valid and invalid records independently and skips rows populated only under empty headers', async () => {
    const parsed = await readExperienceExcel(workbook(
      `<row r="2">${textCell('B2', 'Valid')}</row>` +
      `<row r="3">${textCell('A3', 'Ignored')}</row>` +
      `<row r="4">${textCell('B4', ' ')}${textCell('D4', 'javascript:alert(1)')}${textCell('E4', 'bad URL')}${textCell('K4', 'Maybe')}</row>`
    ));
    expect(parsed.experiences.length).toBe(1);
    expect(parsed.report.length).toBe(2);
    expect(parsed.report[0].message).toContain('Record 1 is successfully parsed');
    expect(parsed.report[1].message).toContain('Record 3 had following issues');
    expect(parsed.report[1].message).toContain('Project Name is required');
    expect(parsed.report[1].message).toContain('Web link must');
    expect(parsed.report[1].message).toContain('Photos must');
    expect(parsed.report[1].message).toContain('Is Updated must');
  });

  it('matches reordered headers without case sensitivity and permits absent optional columns', async () => {
    const parsed = await readExperienceExcel(workbook(`<row r="2">${textCell('A2', 'No')}${textCell('D2', 'Project')}</row>`, {
      headers: textCell('A1', ' is   UPDATED ') + textCell('D1', ' project name ')
    }));
    expect(parsed.experiences[0]).toEqual(jasmine.objectContaining({ company: 'Project', isUpdated: false, webLink: '' }));
  });

  it('reads shared and rich strings, native booleans, and sparse cell addresses', async () => {
    const parsed = await readExperienceExcel(workbook('<row r="2"><c r="B2" t="s"><v>0</v></c><c r="K2" t="b"><v>0</v></c></row>', {
      extra: {
        'xl/_rels/workbook.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="projects" Type="${relationships}/worksheet" Target="worksheets/projects.xml"/><Relationship Id="strings" Type="${relationships}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`,
        'xl/sharedStrings.xml': `<sst xmlns="${namespace}"><si><r><t>Rich </t></r><r><t>project</t></r></si></sst>`
      }
    }));
    expect(parsed.experiences[0].company).toBe('Rich project');
    expect(parsed.experiences[0].isUpdated).toBeFalse();
  });

  it('accepts update values and preserves an unset status', async () => {
    const values = ['Yes', 'true', '1', 'Да', 'No', 'false', '0', 'Нет', ''];
    const parsed = await readExperienceExcel(workbook(values.map((value, index) =>
      `<row r="${index + 2}">${textCell(`B${index + 2}`, 'Project')}${textCell(`K${index + 2}`, value)}</row>`).join('')));
    expect(parsed.experiences.map((entry) => entry.isUpdated)).toEqual([true, true, true, true, false, false, false, false, null]);
  });

  it('uses hyperlink targets for Web link and Photos when cells contain display labels', async () => {
    const parsed = await readExperienceExcel(workbook('', { extra: {
      'xl/worksheets/projects.xml': `<worksheet xmlns="${namespace}" xmlns:r="${relationships}"><sheetData><row r="1">${headers}</row><row r="2">${textCell('B2', 'Project')}${textCell('D2', 'Website')}${textCell('E2', 'Photos')}</row></sheetData><hyperlinks><hyperlink ref="D2" r:id="web"/><hyperlink ref="E2" r:id="photos"/></hyperlinks></worksheet>`,
      'xl/worksheets/_rels/projects.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="web" Type="${relationships}/hyperlink" Target="https://example.com/" TargetMode="External"/><Relationship Id="photos" Type="${relationships}/hyperlink" Target="https://example.com/photos" TargetMode="External"/></Relationships>`
    } }));
    expect(parsed.experiences[0].webLink).toBe('https://example.com/');
    expect(parsed.experiences[0].photos).toBe('https://example.com/photos');
  });

  it('reports formulas and missing shared strings as record errors', async () => {
    const parsed = await readExperienceExcel(workbook(
      '<row r="2"><c r="B2"><f>CONCAT("Project")</f><v>Project</v></c></row>' +
      '<row r="3"><c r="B3" t="s"><v>4</v></c></row>'
    ));
    expect(parsed.experiences).toEqual([]);
    expect(parsed.report[0].message).toContain('formulas are not supported');
    expect(parsed.report[1].message).toContain('missing shared string');
  });

  it('rejects missing, duplicate and unknown headers with useful structure errors', async () => {
    for (const [header, issue] of [
      [textCell('A1', 'Description'), 'Project Name column is required'],
      [textCell('A1', 'Project Name') + textCell('B1', 'Project Name'), 'Duplicate column header'],
      [textCell('A1', 'Project Name') + textCell('B1', 'Unexpected'), 'Unknown column header']
    ]) {
      await expectAsync(readExperienceExcel(workbook('', { headers: header }))).toBeRejectedWithError(new RegExp(issue));
    }
  });

  it('rejects broken archives, malformed XML, missing parts and incorrect file types', async () => {
    await expectAsync(readExperienceExcel(new File(['not a ZIP'], 'broken.xlsx'))).toBeRejectedWithError(/readable|missing/);
    await expectAsync(readExperienceExcel(new File([], 'empty.xlsx'))).toBeRejectedWithError(/empty/);
    await expectAsync(readExperienceExcel(new File(['data'], 'file.xls'))).toBeRejectedWithError(/\.xlsx/);
    await expectAsync(readExperienceExcel(workbook('', { extra: { 'xl/worksheets/projects.xml': '<worksheet>' } })))
      .toBeRejectedWithError(/XML structure/);
    await expectAsync(readExperienceExcel(new File([new Uint8Array(zipSync({ 'unrelated.xml': strToU8('<test/>') }))], 'wrong.xlsx')))
      .toBeRejectedWithError(/missing/);
  });

  it('reports a headers-only template and generates a readable workbook with all ten columns', async () => {
    const template = createExperienceTemplate();
    const parts = unzipSync(new Uint8Array(await template.arrayBuffer()));
    expect(parts['xl/styles.xml']).toBeDefined();
    const workbook = new DOMParser().parseFromString(strFromU8(parts['xl/workbook.xml']), 'application/xml');
    expect(workbook.getElementsByTagNameNS('*', 'workbookView').length).toBe(1);
    const sheet = new DOMParser().parseFromString(strFromU8(parts['xl/worksheets/sheet1.xml']), 'application/xml');
    expect(Array.from(sheet.getElementsByTagNameNS('*', 't'), (cell) => cell.textContent))
      .toEqual(EXPERIENCE_COLUMNS.map((column) => column.label));
    const parsed = await readExperienceExcel(new File([template], 'template.xlsx'));
    expect(parsed.experiences).toEqual([]);
    expect(parsed.report).toEqual([{ type: 'error', message: 'No experience records were found below the headers.' }]);
  });

  it('rejects excessive record counts before returning a partial import', async () => {
    const rows = Array.from({ length: 1001 }, (_, index) => `<row r="${index + 2}">${textCell(`B${index + 2}`, 'Project')}</row>`).join('');
    await expectAsync(readExperienceExcel(workbook(rows))).toBeRejectedWithError(/1,000/);
  });
});
