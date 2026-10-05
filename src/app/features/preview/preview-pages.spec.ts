import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CvDraft, CvInfo } from '../cv/cv-draft';
import { Preview } from './preview';

describe('Paginated CV preview', () => {
  it('settles at a stable size near the vertical scrollbar threshold', async () => {
    TestBed.configureTestingModule({
      imports: [Preview],
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    });
    const fixture = TestBed.createComponent(Preview);
    TestBed.inject(CvDraft).save({
      name: 'Alex', positionTitle: 'Developer', description: 'Summary',
      photo: null, languages: [], technologies: [], experiences: []
    });
    fixture.componentRef.setInput('embedded', true);
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    const viewport = page.querySelector<HTMLElement>('.document-viewport')!;
    const stack = page.querySelector<HTMLElement>('.page-stack')!;
    viewport.style.width = '440px';

    const sampleWidths = async (frames: number): Promise<number[]> => {
      const widths: number[] = [];
      for (let frame = 0; frame < frames; frame++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await fixture.whenStable();
        widths.push(stack.getBoundingClientRect().width);
      }
      return widths;
    };

    viewport.style.maxHeight = '2000px';
    await sampleWidths(5);
    const expandedHeight = viewport.scrollHeight;
    viewport.style.maxHeight = '200px';
    await sampleWidths(5);
    const scrolledHeight = viewport.scrollHeight;
    viewport.style.maxHeight = `${(expandedHeight + scrolledHeight) / 2}px`;
    const widths = (await sampleWidths(20)).slice(-8);

    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
  });
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
