import { Directive, ElementRef, Injectable, effect, inject, input, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class JoyrideTargets {
  private readonly targets = signal<ReadonlyMap<string, HTMLElement>>(new Map());

  register(name: string, element: HTMLElement): () => void {
    this.targets.update((targets) => new Map(targets).set(name, element));
    return () => {
      this.targets.update((targets) => {
        if (targets.get(name) !== element) return targets;
        const remaining = new Map(targets);
        remaining.delete(name);
        return remaining;
      });
    };
  }

  get(name: string): HTMLElement | undefined {
    return this.targets().get(name);
  }
}

@Directive({ selector: '[appJoyrideTarget]' })
export class JoyrideTarget {
  readonly appJoyrideTarget = input.required<string>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly targets = inject(JoyrideTargets);

  constructor() {
    effect((onCleanup) => {
      onCleanup(this.targets.register(this.appJoyrideTarget(), this.element.nativeElement));
    });
  }
}
