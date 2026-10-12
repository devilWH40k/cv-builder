import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SavedCv } from '../../../cv/services/saved-cvs';
import { CvCollection } from './cv-collection';

describe('CV collection last-updated labels', () => {
  let fixture: ComponentFixture<CvCollection>;
  const now = Date.UTC(2026, 9, 12, 12);
  const cv: SavedCv = {
    id: 'saved', updatedAt: now - 59000,
    info: { name: 'Ada', positionTitle: 'Engineer', description: '', photo: null,
      languages: [], experiences: [], technologies: [] }
  };

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(now));
    TestBed.configureTestingModule({
      imports: [CvCollection], providers: [provideZonelessChangeDetection(), provideRouter([])]
    });
    fixture = TestBed.createComponent(CvCollection);
    fixture.componentRef.setInput('cvs', [cv]);
  });

  afterEach(() => {
    fixture.destroy();
    jasmine.clock().uninstall();
  });

  it('shows the compact time beside delete and updates as time passes and a CV is saved', () => {
    fixture.componentRef.setInput('isListView', true);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const time = page.querySelector<HTMLTimeElement>('.cv-updated')!;
    expect(time.textContent).toBe('just now');
    expect(Date.parse(time.dateTime)).toBe(cv.updatedAt);
    expect(time.title).toContain('Last updated:');
    expect(time.getAttribute('aria-label')).toBe('Last updated just now');
    expect(time.closest('.saved-card')?.querySelector('.delete-cv')).not.toBeNull();
    jasmine.clock().tick(1000);
    fixture.detectChanges();
    expect(time.textContent).toBe('1min ago');
    jasmine.clock().tick(60000);
    fixture.detectChanges();
    expect(time.textContent).toBe('2min ago');
    fixture.componentRef.setInput('cvs', [{ ...cv, updatedAt: Date.now() }]);
    fixture.detectChanges();
    expect(time.textContent).toBe('just now');
  });

  it('shows time only for CV list rows and refreshes it when switching from cards', () => {
    fixture.componentRef.setInput('folders', [{ id: 'folder', name: 'Applications', cvIds: [] }]);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('.cv-updated')).toBeNull();
    jasmine.clock().tick(90000);
    fixture.componentRef.setInput('isListView', true);
    fixture.detectChanges();
    expect(page.querySelector('.cv-updated')?.textContent).toBe('2min ago');
    expect(page.querySelector('.folder-card time')).toBeNull();
    fixture.componentRef.setInput('isListView', false);
    fixture.detectChanges();
    expect(page.querySelector('.cv-updated')).toBeNull();
  });
});
