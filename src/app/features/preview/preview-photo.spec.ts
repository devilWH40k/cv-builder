import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CvDraft, CvInfo } from '../cv/cv-draft';
import { Preview } from './preview';

describe('Preview photo visibility', () => {
  const info: CvInfo = {
    name: 'Alex', positionTitle: 'Developer', description: 'Summary',
    photo: new File(['photo'], 'photo.png', { type: 'image/png' }),
    languages: [], technologies: [], experiences: [],
    structure: { sidebarPosition: 'right', technologiesView: 'blocks' }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Preview],
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    });
    spyOn(URL, 'createObjectURL').and.returnValue(document.createElement('canvas').toDataURL());
    spyOn(URL, 'revokeObjectURL');
  });

  it('shows older CV photos by default and toggles visibility without deleting the photo', async () => {
    const draft = TestBed.inject(CvDraft);
    draft.save(info);
    const fixture = TestBed.createComponent(Preview);
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    const show = page.querySelector<HTMLInputElement>('input[name="photo-visibility"][value="show"]')!;
    const hide = page.querySelector<HTMLInputElement>('input[name="photo-visibility"][value="hide"]')!;
    expect(show.checked).toBeTrue();
    expect(page.querySelector('.portrait')).not.toBeNull();

    hide.click();
    await fixture.whenStable();
    expect(hide.checked).toBeTrue();
    expect(page.querySelector('.portrait')).toBeNull();
    expect(draft.current()?.structure?.showPhoto).toBeFalse();
    expect(draft.current()?.photo).toBe(info.photo);

    show.click();
    await fixture.whenStable();
    expect(page.querySelector('.portrait')).not.toBeNull();
    expect(draft.current()?.structure?.showPhoto).toBeTrue();
  });

  it('resizes the photo, keeps its size when hidden, and restores saved sizing', async () => {
    const draft = TestBed.inject(CvDraft);
    draft.save(info);
    const fixture = TestBed.createComponent(Preview);
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    const resizable = page.querySelector<HTMLElement>('app-resizable')!;
    expect(resizable.getAttribute('aria-valuetext')).toBe('40 millimeters');
    resizable.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    await fixture.whenStable();
    expect(draft.current()?.structure?.photoSizeMm).toBe(60);
    expect(page.querySelector('.portrait')!.getBoundingClientRect().width).toBeCloseTo(60 * 96 / 25.4, 0);
    page.querySelector<HTMLInputElement>('input[value="hide"]')!.click();
    await fixture.whenStable();
    page.querySelector<HTMLInputElement>('input[value="show"]')!.click();
    await fixture.whenStable();
    expect(page.querySelector('app-resizable')?.getAttribute('aria-valuetext')).toBe('60 millimeters');
    draft.save({ ...info, structure: { ...info.structure!, photoSizeMm: 32 } });
    await fixture.whenStable();
    expect(page.querySelector('app-resizable')?.getAttribute('aria-valuetext')).toBe('32 millimeters');
  });

  it('honors a saved hidden photo in the embedded preview and handles missing photos', async () => {
    const draft = TestBed.inject(CvDraft);
    draft.save({ ...info, structure: { ...info.structure!, showPhoto: false } });
    const fixture = TestBed.createComponent(Preview);
    fixture.componentRef.setInput('embedded', true);
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('.portrait')).toBeNull();

    draft.save({ ...info, photo: null });
    await fixture.whenStable();
    expect(page.querySelector('.portrait')).toBeNull();
  });
});
