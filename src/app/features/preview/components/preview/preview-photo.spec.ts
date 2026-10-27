import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CvDraft, CvInfo } from '../../../cv/services/cv-draft';
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

  it('starts with a smaller logo and persists keyboard resizing', async () => {
    const draft = TestBed.inject(CvDraft);
    draft.save({ ...info, companyLogo: info.photo });
    const fixture = TestBed.createComponent(Preview);
    await fixture.whenStable();
    const slider = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.logo-resizer')!;
    expect(slider.getAttribute('aria-valuetext')).toBe('18 millimeters');
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    await fixture.whenStable();
    expect(draft.current()?.structure?.companyLogoSizeMm).toBe(19);
    expect(slider.getAttribute('aria-valuetext')).toBe('19 millimeters');
  });

  it('places the logo at the top right independently of the portrait and releases replaced URLs', async () => {
    const draft = TestBed.inject(CvDraft);
    const companyLogo = new File(['logo'], 'company.png', { type: 'image/png' });
    draft.save({ ...info, photo: null, companyLogo });
    const fixture = TestBed.createComponent(Preview);
    fixture.componentRef.setInput('embedded', true);
    fixture.componentRef.setInput('readOnly', true);
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    const logo = page.querySelector<HTMLImageElement>('.company-logo')!;
    const header = page.querySelector<HTMLElement>('.cv-header')!;
    expect(logo.alt).toBe('Company logo');
    expect(logo.getBoundingClientRect().right).toBeCloseTo(header.getBoundingClientRect().right, 0);
    expect(logo.getBoundingClientRect().top).toBeCloseTo(header.getBoundingClientRect().top, 0);
    expect(getComputedStyle(logo).objectFit).toBe('contain');
    draft.save({ ...info, companyLogo: null });
    await fixture.whenStable();
    expect(page.querySelector('.company-logo')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(logo.src);
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

  it('preserves saved photo sizing without resize controls in a read-only preview', async () => {
    const draft = TestBed.inject(CvDraft);
    draft.save({ ...info, structure: { ...info.structure!, photoSizeMm: 32 } });
    const fixture = TestBed.createComponent(Preview);
    fixture.componentRef.setInput('embedded', true);
    fixture.componentRef.setInput('readOnly', true);
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    const photo = page.querySelector<HTMLImageElement>('.portrait')!;
    expect(photo.style.width).toBe('32mm');
    expect(photo.style.height).toBe('32mm');
    expect(page.querySelector('app-resizable')).toBeNull();
    expect(draft.current()?.structure?.photoSizeMm).toBe(32);
  });
});
