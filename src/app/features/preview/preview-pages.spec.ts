import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CvDraft, CvInfo } from '../cv/cv-draft';
import { Preview } from './preview';

describe('Paginated CV preview', () => {
  it('grows and shrinks A4 sheets with content', async () => {
    TestBed.configureTestingModule({
      imports: [Preview],
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    });
    const draft = TestBed.inject(CvDraft);
    const info: CvInfo = {
      name: 'Alex', positionTitle: 'Developer', description: 'Summary',
      photo: null, languages: [], technologies: [],
      structure: { theme: 'dark', sidebarPosition: 'right', technologiesView: 'blocks' },
      experiences: Array.from({ length: 12 }, (_, index) => ({
        company: 'Company ' + index, position: 'Developer', startDate: '', endDate: '',
        isCurrent: false, technologies: [],
        description: '<p>' + 'Built accessible applications. '.repeat(35) + '</p>'
      }))
    };
    draft.save(info);
    const fixture = TestBed.createComponent(Preview);
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    const sheets = page.querySelectorAll<HTMLElement>('.cv-document');
    expect(sheets.length).toBeGreaterThan(1);
    expect(page.querySelector('.page-count')?.textContent).toBe(sheets.length + ' pages');
    expect(page.querySelectorAll('.page-label').length).toBe(sheets.length);
    expect(getComputedStyle(sheets[0], '::before').content).toBe('none');
    expect(getComputedStyle(sheets[1], '::before').content).toBe('none');
    expect(sheets[0].getBoundingClientRect().height).toBeCloseTo(297 * 96 / 25.4, 0);
    expect(sheets[1].getBoundingClientRect().top).toBeGreaterThan(sheets[0].getBoundingClientRect().bottom);
    const flow = page.querySelector<HTMLElement>('.page-flow')!;
    expect(flow.scrollWidth).toBeGreaterThan(flow.clientWidth);
    draft.save({ ...info, experiences: [] });
    await fixture.whenStable();
    expect(page.querySelectorAll('.cv-document').length).toBe(1);
    expect(page.querySelector('.page-count')?.textContent).toBe('1 page');
  });
});
