import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ExperienceImportDialog } from './experience-import-dialog';
import { ExperienceExcel } from '../../services/experience-excel';
import { ExperienceImportResult } from '../../helpers/experience-excel';
import { SavedCvs } from '../../../cv/services/saved-cvs';

const experience = { company: 'Imported project', position: '', startDate: '', endDate: '', isCurrent: false,
  technologies: ['Angular'], description: '<p>Project</p>' };
const result: ExperienceImportResult = { experiences: [experience], report: [
  { type: 'success', message: 'Record 1 is successfully parsed.' },
  { type: 'error', message: 'Record 3 had following issues: Project Name is required.' }
] };

describe('Experience import dialog', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  async function setup() {
    const parse = spyOn(TestBed.inject(ExperienceExcel), 'parse').and.resolveTo(result);
    const download = spyOn(TestBed.inject(ExperienceExcel), 'downloadTemplate').and.resolveTo();
    const save = spyOn(TestBed.inject(SavedCvs), 'importExperiences').and.resolveTo([
      { id: 'imported-1', experience: { ...experience, savedExperienceId: 'imported-1' }, updatedAt: 1 }
    ]);
    const fixture = TestBed.createComponent(ExperienceImportDialog);
    const applied = jasmine.createSpy('applied');
    const cancelled = jasmine.createSpy('cancelled');
    fixture.componentInstance.applied.subscribe(applied);
    fixture.componentInstance.cancelled.subscribe(cancelled);
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('#experience-import')!;
    const select = (name = 'experiences.xlsx') => {
      const input = dialog.querySelector<HTMLInputElement>('#experience-import-file')!;
      const file = new File(['xlsx'], name);
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change'));
      return file;
    };
    return { fixture, dialog, select, parse, save, applied, cancelled, download };
  }

  it('uses the shared file uploader, reports each row, and writes only after Apply', async () => {
    const { fixture, dialog, select, parse, save, applied } = await setup();
    const apply = dialog.querySelector<HTMLButtonElement>('.apply button')!;
    expect(apply.disabled).toBeTrue();
    const file = select();
    await fixture.whenStable();
    expect(parse).toHaveBeenCalledOnceWith(file);
    expect(dialog.querySelector<HTMLInputElement>('input[type="file"]')!.accept).toBe('.xlsx');
    expect(dialog.querySelector('app-file-upload img')).toBeNull();
    expect(dialog.querySelector('.report .success')?.textContent).toContain('Record 1 is successfully parsed');
    expect(dialog.querySelector('.report .error')?.textContent).toContain('Record 3 had following issues');
    expect(parseFloat(getComputedStyle(dialog.querySelector<HTMLElement>('.report')!).height)).toBe(256);
    expect(apply.disabled).toBeFalse();
    expect(save).not.toHaveBeenCalled();
    apply.click();
    await fixture.whenStable();
    expect(save).toHaveBeenCalledOnceWith([experience]);
    expect(applied).toHaveBeenCalledWith([jasmine.objectContaining({ id: 'imported-1' })]);
  });

  it('shows broken-file reasons, disables Apply, and clears previous valid records', async () => {
    const { fixture, dialog, select, parse, save } = await setup();
    select();
    await fixture.whenStable();
    parse.and.rejectWith(new Error('The Project Name column is required.'));
    select('broken.xlsx');
    await fixture.whenStable();
    expect(dialog.querySelector('.report .error')?.textContent).toContain('File could not be parsed: The Project Name column is required');
    expect(dialog.querySelector<HTMLButtonElement>('.apply button')!.disabled).toBeTrue();
    expect(save).not.toHaveBeenCalled();
  });

  it('keeps Apply disabled when all records are invalid and scrolls a fixed report region', async () => {
    const { fixture, dialog, select, parse, save } = await setup();
    parse.and.resolveTo({ experiences: [], report: Array.from({ length: 50 }, (_, index) => ({
      type: 'error', message: `Record ${index + 1} had following issues: Project Name is required.`
    })) });
    select();
    await fixture.whenStable();
    const report = dialog.querySelector<HTMLElement>('.report')!;
    expect(report.scrollHeight).toBeGreaterThan(report.clientHeight);
    expect(getComputedStyle(report).overflowY).toBe('auto');
    expect(dialog.querySelector<HTMLButtonElement>('.apply button')!.disabled).toBeTrue();
    expect(save).not.toHaveBeenCalled();
  });

  it('retains parsed records after a failed save and allows retry', async () => {
    const { fixture, dialog, select, save, applied, parse } = await setup();
    save.and.rejectWith(new Error('Storage failed'));
    select();
    await fixture.whenStable();
    const apply = dialog.querySelector<HTMLButtonElement>('.apply button')!;
    apply.click();
    await fixture.whenStable();
    expect(dialog.open).toBeTrue();
    expect(applied).not.toHaveBeenCalled();
    expect(dialog.textContent).toContain('No records were added');
    expect(apply.disabled).toBeFalse();
    save.and.resolveTo([{ id: 'retry-1', updatedAt: 1, experience }]);
    apply.click();
    await fixture.whenStable();
    expect(applied).toHaveBeenCalled();
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('disables file changes and dismissal during Apply and prevents duplicate writes', async () => {
    const { fixture, dialog, select, save, parse, applied, cancelled } = await setup();
    let finish!: () => void;
    save.and.returnValue(new Promise((resolve) => { finish = () => resolve([
      { id: 'imported-1', updatedAt: 1, experience }
    ]); }));
    select();
    await fixture.whenStable();
    const apply = dialog.querySelector<HTMLButtonElement>('.apply button')!;
    apply.click();
    apply.click();
    fixture.detectChanges();
    expect(dialog.querySelector<HTMLInputElement>('input[type="file"]')!.disabled).toBeTrue();
    expect(apply.disabled).toBeTrue();
    expect(save).toHaveBeenCalledOnceWith([experience]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelled).not.toHaveBeenCalled();
    select('another.xlsx');
    expect(parse).toHaveBeenCalledTimes(1);
    finish();
    await fixture.whenStable();
    expect(applied).toHaveBeenCalled();
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('ignores stale parsing results when a different file is selected', async () => {
    const { fixture, dialog, select, parse } = await setup();
    let finishOld!: (result: ExperienceImportResult) => void;
    let finishNew!: (result: ExperienceImportResult) => void;
    parse.and.returnValues(new Promise((resolve) => { finishOld = resolve; }), new Promise((resolve) => { finishNew = resolve; }));
    select('old.xlsx');
    fixture.detectChanges();
    select('new.xlsx');
    fixture.detectChanges();
    expect(dialog.querySelector<HTMLButtonElement>('.apply button')!.disabled).toBeTrue();
    finishNew({ experiences: [], report: [{ type: 'error', message: 'New file is invalid.' }] });
    await Promise.resolve();
    finishOld(result);
    await fixture.whenStable();
    expect(dialog.textContent).toContain('New file is invalid');
    expect(dialog.textContent).not.toContain('Record 1 is successfully parsed');
    expect(dialog.querySelector<HTMLButtonElement>('.apply button')!.disabled).toBeTrue();
  });

  it('cancels without writing and downloads the template from the left action', async () => {
    const { fixture, dialog, select, save, cancelled, download } = await setup();
    select();
    await fixture.whenStable();
    dialog.querySelector<HTMLButtonElement>('.download-template button')!.click();
    await fixture.whenStable();
    expect(download).toHaveBeenCalledOnceWith();
    expect(dialog.querySelector('.download-template')!.getBoundingClientRect().left)
      .toBeLessThan(dialog.querySelector('.apply-actions')!.getBoundingClientRect().left);
    dialog.querySelector<HTMLButtonElement>('.cancel button')!.click();
    expect(cancelled).toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});
