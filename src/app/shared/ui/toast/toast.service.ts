import { DestroyRef, inject, Injectable, signal } from '@angular/core';

export type ToastTheme = 'success' | 'danger' | 'alert';

export interface ToastMessage {
  readonly id: number;
  readonly theme: ToastTheme;
  readonly message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<readonly ToastMessage[]>([]);
  readonly messages = this.items.asReadonly();
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const timer of this.timers.values()) clearTimeout(timer);
    });
  }

  show(theme: ToastTheme, message: string): number {
    const id = ++this.nextId;
    this.items.update((items) => [...items, { id, theme, message }]);
    this.resume(id);
    return id;
  }

  dismiss(id: number): void {
    this.pause(id);
    this.items.update((items) => items.filter((item) => item.id !== id));
  }

  pause(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
  }

  resume(id: number): void {
    this.pause(id);
    if (this.items().find((item) => item.id === id)?.theme === 'success') {
      this.timers.set(id, setTimeout(() => this.dismiss(id), 5000));
    }
  }
}

