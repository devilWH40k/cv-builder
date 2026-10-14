import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ExperienceExcel } from './experience-excel';
import { readExperienceExcel } from '../helpers/experience-excel';

describe('Experience Excel template download', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));
  it('downloads a readable template.xlsx and removes the temporary link', async () => {
    const create = spyOn(URL, 'createObjectURL').and.returnValue('blob:experience-template');
    let filename = '';
    let address = '';
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      filename = this.download;
      address = this.href;
    });
    await TestBed.inject(ExperienceExcel).downloadTemplate();
    expect(filename).toBe('template.xlsx');
    expect(address).toBe('blob:experience-template');
    expect(document.querySelector('a[download="template.xlsx"]')).toBeNull();
    const blob = create.calls.mostRecent().args[0];
    expect(blob instanceof Blob).toBeTrue();
    if (blob instanceof Blob) {
      expect((await readExperienceExcel(new File([blob], filename))).experiences).toEqual([]);
    }
  });
});
