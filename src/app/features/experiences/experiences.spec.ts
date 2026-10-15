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
    expect(row.querySelector('.description p')?.textContent).toBe('CRM system');
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

  it('toggles data columns immediately while preserving grid alignment and sticky actions', async () => {
    spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.resolveTo([record]);
    const fixture = TestBed.createComponent(Experiences);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const trigger = root.querySelector<HTMLButtonElement>('[aria-label="Choose visible columns"]')!;
    trigger.parentElement!.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    await fixture.whenStable();
    const choices = root.querySelectorAll<HTMLInputElement>('app-checkbox input');
    expect(choices.length).toBe(13);
    expect(Array.from(choices).every((checkbox) => checkbox.checked)).toBeTrue();
    const position = root.querySelector<HTMLInputElement>('#experience-column-position')!;
    const row = root.querySelector<HTMLElement>('app-table-row')!;
    const header = root.querySelector<HTMLElement>('app-table-header')!;
    const originalWidth = row.getBoundingClientRect().width;
    position.click();
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    trigger.parentElement!.dispatchEvent(new PointerEvent('pointerleave'));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(position.checked).toBeFalse();
    expect(Array.from(header.querySelectorAll('[role="columnheader"]'), (cell) => cell.textContent)).not.toContain('Position');
    expect(row.textContent).not.toContain('Engineer');
    expect(row.querySelectorAll('[role="cell"]').length).toBe(13);
    expect(row.getBoundingClientRect().width).toBeLessThan(originalWidth);
    expect(getComputedStyle(row).gridTemplateColumns).toBe(getComputedStyle(header).gridTemplateColumns);
    expect(getComputedStyle(row.lastElementChild!).position).toBe('sticky');
    expect(root.querySelector('[aria-label="Edit Project"]')).not.toBeNull();
    expect(root.querySelector('[aria-label="Delete Project"]')).not.toBeNull();
    position.click();
    await fixture.whenStable();
    expect(row.textContent).toContain('Engineer');
    expect(row.querySelectorAll('[role="cell"]').length).toBe(14);
    expect(row.getBoundingClientRect().width).toBeCloseTo(originalWidth, 0);
    for (const checkbox of choices) checkbox.click();
    await fixture.whenStable();
    expect(header.textContent).toBe('Actions');
    expect(row.querySelectorAll('[role="cell"]').length).toBe(1);
    expect(getComputedStyle(row).gridTemplateColumns).toBe(getComputedStyle(header).gridTemplateColumns);
  });

  it('keeps column settings open when clicking a checkbox label temporarily clears focus', async () => {
    spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.resolveTo([record]);
    const fixture = TestBed.createComponent(Experiences);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const trigger = root.querySelector<HTMLButtonElement>('[aria-label="Choose visible columns"]')!;
    trigger.focus();
    trigger.click();
    await fixture.whenStable();
    const checkbox = root.querySelector<HTMLInputElement>('#experience-column-position')!;
    const label = root.querySelector<HTMLLabelElement>('label[for="experience-column-position"]')!;
    for (const target of [label.querySelector<HTMLElement>('.label')!, label]) {
      const wasChecked = checkbox.checked;
      target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      (document.activeElement as HTMLElement).blur();
      await fixture.whenStable();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      target.click();
      checkbox.focus();
      await fixture.whenStable();
      expect(checkbox.checked).toBe(!wasChecked);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(Array.from(root.querySelectorAll('[role="columnheader"]'), (cell) => cell.textContent)
        .includes('Position')).toBe(checkbox.checked);
    }
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    outside.remove();
  });

  it('supports keyboard navigation in the checkbox dropdown and dismisses on Escape or outside click', async () => {
    spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.resolveTo([]);
    const fixture = TestBed.createComponent(Experiences);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const trigger = root.querySelector<HTMLButtonElement>('[aria-label="Choose visible columns"]')!;
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();
    const checkboxes = root.querySelectorAll<HTMLInputElement>('app-checkbox input');
    expect(document.activeElement).toBe(checkboxes[0]);
    checkboxes[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await fixture.whenStable();
    expect(document.activeElement).toBe(checkboxes[12]);
    checkboxes[12].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    trigger.click();
    await fixture.whenStable();
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('filters supplied experiences through the table wrapper and can clear the search', async () => {
    spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.resolveTo([
      record, { ...record, id: 'other', experience: { ...record.experience, company: 'Other project', position: 'Designer' } }
    ]);
    const fixture = TestBed.createComponent(Experiences);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const search = root.querySelector<HTMLInputElement>('#experience-search')!;
    search.value = 'engineer';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(root.querySelectorAll('app-table-row').length).toBe(1);
    expect(root.querySelector('app-table-row')!.textContent).toContain('Project');
    search.value = 'missing';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(root.querySelectorAll('app-table-row').length).toBe(0);
    expect(root.textContent).toContain('No records match your search.');
    search.value = '';
    search.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(root.querySelectorAll('app-table-row').length).toBe(2);
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

  it('keeps the experience when deletion is cancelled', async () => {
    spyOn(TestBed.inject(SavedCvs), 'listExperiences').and.resolveTo([record]);
    const remove = spyOn(TestBed.inject(SavedCvs), 'deleteExperience');
    const fixture = TestBed.createComponent(Experiences);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('[aria-label="Delete Project"]')!.click();
    await fixture.whenStable();
    document.querySelector<HTMLButtonElement>('#delete-confirmation .cancel button')!.click();
    await fixture.whenStable();
    expect(remove).not.toHaveBeenCalled();
    expect(root.querySelector('app-table-row')).not.toBeNull();
    expect(document.querySelector('#delete-confirmation')).toBeNull();
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
    expect(remove).not.toHaveBeenCalled();
    expect(document.querySelector('#delete-confirmation')!.textContent).toContain('Project');
    document.querySelector<HTMLButtonElement>('#delete-confirmation .confirm-delete button')!.click();
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
    expect(remove).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('#delete-confirmation .confirm-delete button')!.click();
    await fixture.whenStable();
    expect(root.querySelector('app-table-row')).not.toBeNull();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('could not be deleted');
    expect(button.disabled).toBeFalse();
    remove.and.resolveTo();
    button.click();
    await fixture.whenStable();
    document.querySelector<HTMLButtonElement>('#delete-confirmation .confirm-delete button')!.click();
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
