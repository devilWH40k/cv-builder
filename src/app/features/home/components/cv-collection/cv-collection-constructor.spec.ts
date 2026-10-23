import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CvCollection } from './cv-collection';
import { SavedCv } from '../../../cv/services/saved-cvs';

describe('CV constructor context action', () => {
  it('opens the selected CV in the constructor and disables the action during deletion', async () => {
    TestBed.configureTestingModule({
      imports: [CvCollection],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(CvCollection);
    const cv: SavedCv = {
      id: 'chosen-cv',
      updatedAt: 1,
      info: {
        name: 'Ada',
        positionTitle: '',
        description: '',
        photo: null,
        technologies: [],
        languages: [],
        experiences: [],
      },
    };
    fixture.componentRef.setInput('cvs', [cv]);
    await fixture.whenStable();
    const card: HTMLElement = fixture.nativeElement.querySelector('.cv-card');
    const openMenu = async () => {
      card.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 40,
          clientY: 40,
        }),
      );
      await fixture.whenStable();
      return document.querySelector<HTMLButtonElement>('[data-menu-id="constructor"]')!;
    };
    const action = await openMenu();
    expect(action.textContent).toContain('Open in constructor');
    action.click();
    expect(navigate).toHaveBeenCalledOnceWith(['/constructor'], {
      queryParams: { cv: cv.id, returnTab: 'files' },
    });
    fixture.componentRef.setInput('deletingIds', [cv.id]);
    await fixture.whenStable();
    expect((await openMenu()).disabled).toBeTrue();
  });
});
