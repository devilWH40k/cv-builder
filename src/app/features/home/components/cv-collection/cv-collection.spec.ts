import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CvDraft } from '../../../cv/services/cv-draft';
import { CvPdf } from '../../../cv/services/cv-pdf';
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

describe('CV collection quick actions', () => {
  const cvs: readonly SavedCv[] = ['Ada', 'Grace'].map((name) => ({
    id: name, updatedAt: Date.now(),
    info: { name, positionTitle: 'Engineer', description: '', photo: null,
      languages: [], experiences: [], technologies: [] }
  }));
  let fixture: ComponentFixture<CvCollection>;
  let download: jasmine.Spy;
  const exporting = signal(false);

  beforeEach(() => {
    exporting.set(false);
    download = jasmine.createSpy('download').and.resolveTo();
    TestBed.configureTestingModule({
      imports: [CvCollection],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [provideZonelessChangeDetection(), provideRouter([]),
        { provide: CvPdf, useValue: { download, exporting } }]
    });
    fixture = TestBed.createComponent(CvCollection);
    fixture.componentRef.setInput('cvs', cvs);
  });

  for (const view of ['card', 'list']) {
    it(`previews the selected ${view} and closes without editing or navigating`, async () => {
      fixture.componentRef.setInput('isListView', view === 'list');
      const deleted = jasmine.createSpy('deleted');
      fixture.componentInstance.cvDeleted.subscribe(deleted);
      const draft = TestBed.inject(CvDraft);
      draft.save(cvs[0].info);
      draft.savedId.set(cvs[0].id);
      await fixture.whenStable();
      const page: HTMLElement = fixture.nativeElement;
      const button = page.querySelectorAll<HTMLButtonElement>('.preview-cv')[1];
      button.focus();
      button.click();
      const [preview] = await fixture.getDeferBlocks();
      await preview.render(DeferBlockState.Complete);
      await fixture.whenStable();
      const dialog = document.querySelector<HTMLDialogElement>('#cv-preview-Grace')!;
      expect(dialog.open).toBeTrue();
      expect(dialog.querySelector('.cv-info h2')?.textContent).toBe('Grace');
      expect(dialog.querySelector('.page-label')?.textContent).toBe('Page 1 of 1');
      expect(draft.current()?.name).toBe('Ada');
      expect(draft.savedId()).toBe('Ada');
      expect(TestBed.inject(Router).url).toBe('/');
      expect(deleted).not.toHaveBeenCalled();
      expect(download).not.toHaveBeenCalled();
      dialog.querySelector<HTMLButtonElement>('.close')!.click();
      await fixture.whenStable();
      expect(document.querySelector('#cv-preview-Grace')).toBeNull();
      expect(document.activeElement).toBe(button);
    });

    it(`downloads the selected ${view} directly and disables exports while busy`, async () => {
      fixture.componentRef.setInput('isListView', view === 'list');
      await fixture.whenStable();
      const page: HTMLElement = fixture.nativeElement;
      const buttons = page.querySelectorAll<HTMLButtonElement>('.download-cv');
      expect(buttons[1].getAttribute('aria-label')).toBe('Download Grace as PDF');
      buttons[1].click();
      expect(download).toHaveBeenCalledOnceWith(cvs[1].info);
      expect(TestBed.inject(Router).url).toBe('/');
      exporting.set(true);
      await fixture.whenStable();
      expect(Array.from(buttons).every((button) => button.disabled)).toBeTrue();
      exporting.set(false);
      fixture.componentRef.setInput('deletingIds', ['Grace']);
      await fixture.whenStable();
      expect(buttons[0].disabled).toBeFalse();
      expect(buttons[1].disabled).toBeTrue();
      expect(page.querySelectorAll<HTMLButtonElement>('.preview-cv')[1].disabled).toBeTrue();
    });
  }
});
