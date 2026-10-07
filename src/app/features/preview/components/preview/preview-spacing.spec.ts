import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CvDraft } from '../../../cv/services/cv-draft';
import { Preview } from './preview';

describe('Used technology spacing', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideRouter([])]
  }));

  for (const theme of ['basic', 'dark', 'dark-blue'] as const) {
    for (const technologiesView of ['blocks', 'comma-separated'] as const) {
      for (const technologiesPosition of ['top', 'bottom'] as const) {
        it(`keeps ${theme} ${technologiesView} ${technologiesPosition} spacing compact`, async () => {
          const description = '<ul><li><p>Final responsibility.</p></li></ul><p><br></p><p>&nbsp;</p>';
          const draft = TestBed.inject(CvDraft);
          draft.save({ name: 'Alex', positionTitle: 'Engineer', description: '', photo: null,
            technologies: [], languages: [],
            structure: { theme, sidebarPosition: 'right', technologiesView, technologiesPosition },
            experiences: [{ company: 'Example', position: '', startDate: '', endDate: '',
              isCurrent: false, technologies: ['Angular'], description }]
          });
          const fixture = TestBed.createComponent(Preview);
          await fixture.whenStable();
          const host: HTMLElement = fixture.nativeElement;
          const text = host.querySelector<HTMLElement>('.project-description')!;
          const technology = host.querySelector<HTMLElement>('[aria-label="Used technologies"]')!;
          expect(text.lastElementChild?.tagName).toBe('UL');
          const textBounds = text.getBoundingClientRect();
          const technologyBounds = technology.getBoundingClientRect();
          const gap = technologiesPosition === 'top'
            ? textBounds.top - technologyBounds.bottom : technologyBounds.top - textBounds.bottom;
          const expectedMm = technologiesPosition === 'bottom' && technologiesView === 'blocks' ? 4 : 3;
          expect(gap).toBeCloseTo(expectedMm * 96 / 25.4, 0);
          expect(draft.current()?.experiences[0].description).toBe(description);
        });
      }
    }
  }
});
