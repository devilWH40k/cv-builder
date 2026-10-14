import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Experiences } from './experiences';
import { SavedCvs } from '../cv/services/saved-cvs';
import { SavedExperience } from '../cv/interfaces/experience';
import { ExperienceExcel } from './services/experience-excel';

const record: SavedExperience = {
  id: 'experience-1', updatedAt: 1, experience: {
    company: 'Project', position: 'Engineer', startDate: '2020-01', endDate: '2021-04',
    isCurrent: false, technologies: ['Angular', 'TypeScript'], description: '<p>CRM system</p>',
    alternativeNames: 'Alternative', isUpdated: false
  }
};

describe('Experiences page', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  it('renders the requested column order with aligned grid rows and refreshes the edited record', async () => {
    spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.resolveTo([record]);
    const save = spyOn(TestBed.inject(SavedCvs), 'saveExperience').and.resolveTo(record.id);
    const fixture = TestBed.createComponent(Experiences);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const headers = Array.from(root.querySelectorAll('[role="columnheader"]'), (cell) => cell.textContent);
    expect(headers).toEqual(['Project Name', 'Alternative names', 'Position', 'Web link', 'Photos',
      'Start date', 'End date', 'Description', 'Responsibilities', 'Technologies', 'Teamlead', 'Developer',
      'Is Updated', 'Actions']);
    expect(root.querySelector('table, tr, td, th')).toBeNull();
    const row = root.querySelector<HTMLElement>('app-table-row')!;
    const header = root.querySelector<HTMLElement>('app-table-header')!;
    expect(header.querySelectorAll('app-table-cell[role="columnheader"]').length).toBe(headers.length);
    expect(row.querySelectorAll('app-table-cell[role="cell"]').length).toBe(headers.length);
    const cells = row.querySelectorAll('app-table-cell[role="cell"]');
    expect(cells[2].textContent).toBe('Engineer');
    expect(cells[5].textContent).toBe('2020-01');
    expect(cells[6].textContent).toBe('2021-04');
    expect(row.querySelector('app-table-cell.description p')?.textContent).toBe('CRM system');
    expect(getComputedStyle(row).display).toBe('grid');
    expect(getComputedStyle(row).gridTemplateColumns).toBe(getComputedStyle(header).gridTemplateColumns);
    expect(row.textContent).toContain('Angular, TypeScript');
    expect(row.textContent).toContain('false');
    const table = root.querySelector<HTMLElement>('app-table')!;
    const actions = row.querySelector<HTMLElement>('app-table-cell:last-child')!;
    const headerActions = header.querySelector<HTMLElement>('app-table-cell:last-child')!;
    expect(getComputedStyle(row.querySelector<HTMLElement>('app-table-cell')!).borderRightStyle).toBe('solid');
    expect(getComputedStyle(actions).position).toBe('sticky');
    for (const scrollLeft of [0, 400, table.scrollWidth]) {
      table.scrollLeft = scrollLeft;
      expect(actions.getBoundingClientRect().right).toBeCloseTo(table.getBoundingClientRect().right - 1, 0);
      expect(headerActions.getBoundingClientRect().right).toBeCloseTo(actions.getBoundingClientRect().right, 0);
    }
    root.querySelector<HTMLButtonElement>('[aria-label="Edit Project"]')!.click();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('#experience-details')!;
    const input = dialog.querySelector<HTMLInputElement>('#experience-alternative-names')!;
    input.value = 'Updated alternative';
    input.dispatchEvent(new Event('input'));
    dialog.querySelector<HTMLButtonElement>('[dialogActions] app-button:last-child button')!.click();
    await fixture.whenStable();
    expect(save).toHaveBeenCalled();
    expect(row.textContent).toContain('Updated alternative');
    expect(document.querySelector('#experience-details')).toBeNull();
  });

  it('opens Web link and Photos in a new tab and leaves invalid or empty URLs as plain text', async () => {
    spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.resolveTo([
      { ...record, experience: { ...record.experience, webLink: 'https://example.com/project',
        photos: 'https://example.com/photos' } },
      { ...record, id: 'invalid-links', experience: { ...record.experience,
        webLink: 'javascript:alert(1)', photos: '' } }
    ]);
    const fixture = TestBed.createComponent(Experiences);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const links = root.querySelectorAll<HTMLAnchorElement>('app-table-row a');
    expect(Array.from(links, (link) => link.href)).toEqual(['https://example.com/project', 'https://example.com/photos']);
    for (const link of links) {
      expect(link.target).toBe('_blank');
      expect(link.relList.contains('noopener')).toBeTrue();
      expect(link.relList.contains('noreferrer')).toBeTrue();
    }
    const invalidRow = root.querySelectorAll('app-table-row')[1];
    expect(invalidRow.querySelector('a')).toBeNull();
    expect(invalidRow.textContent).toContain('javascript:alert(1)');
  });

  it('displays load failures and allows retry to the empty state', async () => {
    const list = spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.rejectWith(new Error('Read failed'));
    const fixture = TestBed.createComponent(Experiences);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('could not be loaded');
    list.and.resolveTo([]);
    root.querySelector<HTMLButtonElement>('.retry button')!.click();
    await fixture.whenStable();
    expect(root.textContent).toContain('You have no saved experiences');
  });

  it('adds an experience through the dialog and cancels without adding another record', async () => {
    spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.resolveTo([]);
    const save = spyOn(TestBed.inject(SavedCvs), 'saveExperience').and.resolveTo('new-id');
    const fixture = TestBed.createComponent(Experiences);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const add = root.querySelector<HTMLButtonElement>('.page-heading app-button button')!;
    add.click();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('#experience-details')!;
    expect(dialog.querySelector('h2')?.textContent).toBe('Add experience');
    expect(dialog.textContent).not.toContain('Experience 1');
    const input = dialog.querySelector<HTMLInputElement>('#company-0')!;
    expect(input.required).toBeTrue();
    const submit = dialog.querySelector<HTMLButtonElement>('[dialogActions] app-button:last-child button')!;
    submit.click();
    await fixture.whenStable();
    expect(save).not.toHaveBeenCalled();
    expect(dialog.textContent).toContain('Please enter a company or project.');
    input.value = 'New project';
    input.dispatchEvent(new Event('input'));
    submit.click();
    await fixture.whenStable();
    expect(save).toHaveBeenCalledOnceWith(jasmine.objectContaining({ company: 'New project', savedExperienceId: null }));
    expect(root.querySelectorAll('app-table-row').length).toBe(1);
    expect(root.textContent).toContain('New project');
    expect(document.querySelector('#experience-details')).toBeNull();
    add.click();
    await fixture.whenStable();
    document.querySelector<HTMLButtonElement>('#experience-details [dialogActions] app-button:first-child button')!.click();
    await fixture.whenStable();
    expect(root.querySelectorAll('app-table-row').length).toBe(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('waits for deletion to succeed and prevents duplicate requests', async () => {
    spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.resolveTo([record]);
    let complete!: () => void;
    const remove = spyOn(TestBed.inject(SavedCvs), 'deleteExperience')
      .and.returnValue(new Promise<void>((resolve) => { complete = resolve; }));
    const fixture = TestBed.createComponent(Experiences);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const button = root.querySelector<HTMLButtonElement>('[aria-label="Delete Project"]')!;
    button.click();
    button.click();
    await fixture.whenStable();
    expect(remove).toHaveBeenCalledOnceWith(record.id);
    expect(button.disabled).toBeTrue();
    expect(root.querySelector('app-table-row')).not.toBeNull();
    complete();
    await remove.calls.mostRecent().returnValue;
    await fixture.whenStable();
    expect(root.querySelector('app-table-row')).toBeNull();
    expect(root.textContent).toContain('You have no saved experiences');
  });

  it('retains a record after a failed deletion and allows retry', async () => {
    spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.resolveTo([record]);
    const remove = spyOn(TestBed.inject(SavedCvs), 'deleteExperience').and.rejectWith(new Error('Write failed'));
    const fixture = TestBed.createComponent(Experiences);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const button = root.querySelector<HTMLButtonElement>('[aria-label="Delete Project"]')!;
    button.click();
    await fixture.whenStable();
    expect(root.querySelector('app-table-row')).not.toBeNull();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('could not be deleted');
    expect(button.disabled).toBeFalse();
    remove.and.resolveTo();
    button.click();
    await fixture.whenStable();
    expect(root.querySelector('app-table-row')).toBeNull();
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('opens Import to the right of Add experience and renders records after applying', async () => {
    spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.resolveTo([record]);
    const imported = { ...record, id: 'imported', experience: { ...record.experience, company: 'Imported project' } };
    const save = spyOn(TestBed.inject(SavedCvs), 'importExperiences').and.resolveTo([imported]);
    spyOn(TestBed.inject(ExperienceExcel), 'parse').and.resolveTo({ experiences: [imported.experience],
      report: [{ type: 'success', message: 'Record 1 is successfully parsed.' }] });
    const fixture = TestBed.createComponent(Experiences);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const actions = root.querySelectorAll<HTMLButtonElement>('.page-actions app-button button');
    expect(actions[0].textContent).toContain('Add experience');
    expect(actions[1].textContent).toContain('Import');
    expect(actions[1].getBoundingClientRect().left).toBeGreaterThan(actions[0].getBoundingClientRect().left);
    actions[1].click();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('#experience-import')!;
    const input = dialog.querySelector<HTMLInputElement>('input[type="file"]')!;
    const transfer = new DataTransfer();
    transfer.items.add(new File(['data'], 'projects.xlsx'));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(save).not.toHaveBeenCalled();
    expect(root.querySelectorAll('app-table-row').length).toBe(1);
    dialog.querySelector<HTMLButtonElement>('.apply button')!.click();
    await fixture.whenStable();
    expect(root.querySelectorAll('app-table-row').length).toBe(2);
    expect(root.textContent).toContain('Imported project');
    expect(document.querySelector('#experience-import')).toBeNull();
  });
});
