import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SavedCv } from '../../../cv/services/saved-cvs';
import { CvPreviewDialog } from './cv-preview-dialog';

describe('Saved CV preview dialog', () => {
  let fixture: ComponentFixture<CvPreviewDialog>;
  const cv: SavedCv = {
    id: 'saved', updatedAt: Date.now(),
    info: {
      name: 'Alex', positionTitle: 'Developer', description: 'Summary', photo: null,
      languages: [], technologies: [],
      structure: { theme: 'dark', sidebarPosition: 'left', technologiesView: 'blocks' },
      experiences: Array.from({ length: 12 }, (_, index) => ({
        company: 'Company ' + index, position: 'Developer', startDate: '', endDate: '',
        isCurrent: false, technologies: [],
        description: '<p>' + 'Built accessible applications. '.repeat(35) + '</p>'
      }))
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CvPreviewDialog], providers: [provideZonelessChangeDetection(), provideRouter([])]
    });
    fixture = TestBed.createComponent(CvPreviewDialog);
    fixture.componentRef.setInput('cv', cv);
  });

  it('renders the saved theme, content, multiple sheets and page count', async () => {
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('#cv-preview-saved')!;
    const sheets = dialog.querySelectorAll('.cv-document');
    expect(sheets.length).toBeGreaterThan(1);
    expect(dialog.querySelector('.page-count')?.textContent).toBe(sheets.length + ' pages');
    expect(dialog.querySelectorAll('.page-label').length).toBe(sheets.length);
    expect(sheets[0].classList.contains('theme-dark')).toBeTrue();
    expect(dialog.querySelector('.cv-body.sidebar-left')).not.toBeNull();
    expect(dialog.textContent).toContain('Company 11');
    expect(dialog.querySelector('app-structure-options')).toBeNull();
    expect(dialog.querySelector('app-save-cv-button')).toBeNull();
    dialog.querySelector<HTMLElement>('.cv-info')!.click();
    expect(dialog.open).toBeTrue();
  });

  it('shows the Preview heading with visible rounded edges and smaller responsive pages', async () => {
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('#cv-preview-saved')!;
    const title = dialog.querySelector<HTMLElement>('header h2')!;
    expect(title.textContent).toBe('Preview');
    expect(getComputedStyle(title).display).not.toBe('none');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(dialog.querySelector('.close')?.getAttribute('aria-label')).toBe('Close Preview');
    const edit = dialog.querySelector<HTMLAnchorElement>('header .edit-cv')!;
    expect(edit.getAttribute('aria-label')).toBe('Edit Alex');
    expect(edit.getAttribute('href')).toBe('/create?id=saved');
    const constructor = edit.nextElementSibling as HTMLAnchorElement;
    expect(constructor.getAttribute('aria-label')).toBe('Open in constructor');
    expect(constructor.getAttribute('href')).toBe('/constructor?cv=saved');
    expect(constructor.nextElementSibling?.classList.contains('close')).toBeTrue();
    const bounds = dialog.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(document.documentElement).fontSize);
    expect(bounds.height).toBeCloseTo(innerHeight - 2 * gap, 0);
    expect(bounds.top).toBeGreaterThan(0);
    expect(bounds.bottom).toBeLessThan(innerHeight);
    expect(parseFloat(getComputedStyle(dialog).borderTopLeftRadius)).toBeGreaterThan(0);
    const viewport = dialog.querySelector<HTMLElement>('.document-viewport')!;
    expect(getComputedStyle(viewport).maxHeight).toBe('none');

    const settleLayout = async () => {
      for (let frame = 0; frame < 3; frame++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await fixture.whenStable();
      }
    };
    await settleLayout();
    const stack = dialog.querySelector<HTMLElement>('.page-stack')!;
    expect(stack.getBoundingClientRect().width).toBeLessThanOrEqual(210 * 96 / 25.4 * 0.85 + 1);
    viewport.style.width = '320px';
    await settleLayout();
    expect(stack.getBoundingClientRect().width).toBeLessThanOrEqual(viewport.clientWidth);
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
  });

  for (const action of ['backdrop', 'Escape', 'close']) {
    it(`dismisses with ${action} and removes the overlay`, async () => {
      const dismissed = jasmine.createSpy('dismissed');
      fixture.componentInstance.dismissed.subscribe(dismissed);
      await fixture.whenStable();
      const dialog = document.querySelector<HTMLDialogElement>('#cv-preview-saved')!;
      if (action === 'backdrop') dialog.parentElement!.click();
      else if (action === 'Escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      else dialog.querySelector<HTMLButtonElement>('.close')!.click();
      await fixture.whenStable();
      expect(dismissed).toHaveBeenCalledTimes(1);
      expect(document.querySelector('.dialog-overlay')).toBeNull();
      expect(dialog.open).toBeFalse();
    });
  }
});
