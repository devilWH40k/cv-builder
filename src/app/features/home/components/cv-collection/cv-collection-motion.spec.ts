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
});
