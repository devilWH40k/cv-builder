import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SavedCv } from '../../../cv/services/saved-cvs';
import { CvCollectionMotion } from './cv-collection-motion';

@Component({
  imports: [CvCollectionMotion],
  template: `
    <div class="stage" [cvCollectionMotion]="cvs()" [style.margin-top.px]="offset()" style="--cv-reorder-duration: 120ms">
      @for (cv of cvs(); track cv.id) {
        <div class="row" [attr.data-id]="cv.id"><div class="cv-card">{{ cv.info.name }}</div></div>
      }
    </div>
  `,
  styles: '.stage { display: grid; gap: 16px; } .cv-card { height: 60px; }'
})
class MotionHarness {
  readonly offset = signal(0);
  readonly cvs = signal<readonly SavedCv[]>(['a', 'b'].map((id) => ({
    id, updatedAt: 1, info: { name: id, positionTitle: '', description: '', photo: null,
      technologies: [], experiences: [], languages: [] }
  })));
}

describe('CV collection motion', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [MotionHarness], providers: [provideZonelessChangeDetection()]
  }));

  it('animates visual contents without animating item hit areas and cancels motion on destruction', async () => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    spyOnProperty(media, 'matches', 'get').and.returnValue(false);
    spyOn(window, 'matchMedia').and.returnValue(media);
    const fixture = TestBed.createComponent(MotionHarness);
    await fixture.whenStable();
    fixture.componentInstance.cvs.update((cvs) => [...cvs].reverse());
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const row = root.querySelector<HTMLElement>('[data-id="a"]')!;
    const animation = row.querySelector<HTMLElement>('.cv-card')!.getAnimations()[0];
    expect(animation?.effect?.getTiming().duration).toBe(120);
    expect(row.getAnimations().length).toBe(0);
    fixture.destroy();
    expect(animation.playState).toBe('idle');
  });

  it('does not animate when the collection moves without changing item positions inside it', async () => {
    const fixture = TestBed.createComponent(MotionHarness);
    await fixture.whenStable();
    fixture.componentInstance.offset.set(100);
    fixture.componentInstance.cvs.update((cvs) => [...cvs]);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(Array.from(root.querySelectorAll<HTMLElement>('.cv-card')).every((card) => card.getAnimations().length === 0)).toBeTrue();
  });

  it('honors reduced-motion preferences', async () => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    spyOnProperty(media, 'matches', 'get').and.returnValue(true);
    spyOn(window, 'matchMedia').and.returnValue(media);
    const fixture = TestBed.createComponent(MotionHarness);
    await fixture.whenStable();
    fixture.componentInstance.cvs.update((cvs) => [...cvs].reverse());
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(Array.from(root.querySelectorAll<HTMLElement>('.cv-card')).every((card) => card.getAnimations().length === 0)).toBeTrue();
  });

  it('does not restart an in-progress animation when the layout stays unchanged', async () => {
    const fixture = TestBed.createComponent(MotionHarness);
    await fixture.whenStable();
    fixture.componentInstance.cvs.update((cvs) => [...cvs].reverse());
    await fixture.whenStable();
    const card = fixture.nativeElement.querySelector('[data-id="a"] .cv-card') as HTMLElement;
    const animation = card.getAnimations()[0];
    animation.pause();
    animation.currentTime = 40;
    fixture.componentInstance.cvs.update((cvs) => [...cvs]);
    await fixture.whenStable();
    expect(card.getAnimations()).toEqual([animation]);
    expect(animation.currentTime).toBe(40);
  });

  it('skips long-distance slides while nearby cards still animate', async () => {
    const fixture = TestBed.createComponent(MotionHarness);
    const first = fixture.componentInstance.cvs()[0];
    fixture.componentInstance.cvs.set(Array.from({ length: 60 }, (_, index) => ({ ...first, id: String(index) })));
    await fixture.whenStable();
    fixture.componentInstance.cvs.update(([first, ...rest]) => [...rest, first]);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector<HTMLElement>('[data-id="0"] .cv-card')!.getAnimations().length).toBe(0);
    expect(root.querySelector<HTMLElement>('[data-id="1"] .cv-card')!.getAnimations().length).toBe(1);
    expect(root.querySelector<HTMLElement>('[data-id="50"] .cv-card')!.getAnimations().length).toBe(0);
  });

  it('skips animations outside the viewport', async () => {
    const fixture = TestBed.createComponent(MotionHarness);
    fixture.componentInstance.offset.set(window.innerHeight + 100);
    await fixture.whenStable();
    fixture.componentInstance.cvs.update((cvs) => [...cvs].reverse());
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(Array.from(root.querySelectorAll<HTMLElement>('.cv-card')).every((card) => card.getAnimations().length === 0)).toBeTrue();
  });
});
