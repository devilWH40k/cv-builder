import { computed, inject, Injectable, signal } from '@angular/core';
import { ConstructorDocument, ConstructorPage } from '../interfaces/constructor-document';
import { ConstructorEditor } from './constructor-editor';
import { ConstructorRepository } from './constructor-repository';

/** Application state stays independent of Fabric's mutable object instances. */
@Injectable()
export class ConstructorSession {
  private readonly repository = inject(ConstructorRepository);
  private readonly editor = inject(ConstructorEditor);
  private readonly current = signal<ConstructorDocument | null>(null);
  private readonly changed = signal(false);
  private revision = 0;
  readonly document = this.current.asReadonly();
  readonly dirty = this.changed.asReadonly();
  readonly activePage = signal(0);
  readonly saving = signal(false);
  readonly title = computed(() => this.current()?.title ?? 'CV Constructor');

  markChanged(): void {
    this.revision++;
    this.changed.set(true);
  }

  close(): void {
    this.revision++;
    this.current.set(null);
    this.changed.set(false);
    this.activePage.set(0);
  }

  async open(design: ConstructorDocument, isNew = false): Promise<void> {
    await this.editor.load(design.pages[0]);
    this.revision++;
    this.current.set(design);
    this.activePage.set(0);
    this.changed.set(isNew);
  }

  snapshot(): ConstructorDocument | null {
    this.editor.finishEditing();
    const design = this.current();
    if (!design) return null;
    return {
      ...design,
      updatedAt: Date.now(),
      pages: design.pages.map((page, index) =>
        index === this.activePage() ? { ...page, scene: this.editor.snapshot() } : page,
      ),
    };
  }

  rename(title: string): void {
    this.current.update((design) => (design ? { ...design, title: title.slice(0, 200) } : null));
    this.markChanged();
  }

  async switchPage(index: number): Promise<void> {
    if (this.editor.busy()) return;
    const snapshot = this.snapshot();
    if (!snapshot || index < 0 || index >= snapshot.pages.length || index === this.activePage())
      return;
    await this.editor.load(snapshot.pages[index]);
    this.current.set(snapshot);
    this.activePage.set(index);
  }

  async addPage(): Promise<void> {
    const snapshot = this.snapshot();
    if (!snapshot || snapshot.pages.length >= 50 || this.editor.busy()) return;
    const page: ConstructorPage = {
      id: crypto.randomUUID(),
      scene: JSON.stringify({ objects: [], background: '#ffffff' }),
    };
    await this.editor.load(page);
    this.current.set({ ...snapshot, pages: [...snapshot.pages, page] });
    this.activePage.set(snapshot.pages.length);
    this.markChanged();
  }

  async removePage(): Promise<void> {
    const snapshot = this.snapshot();
    if (!snapshot || snapshot.pages.length <= 1 || this.editor.busy()) return;
    const pages = snapshot.pages.filter((_, index) => index !== this.activePage());
    const next = Math.min(this.activePage(), pages.length - 1);
    await this.editor.load(pages[next]);
    this.current.set({ ...snapshot, pages });
    this.activePage.set(next);
    this.markChanged();
  }

  async save(): Promise<string | null> {
    if (this.saving() || this.editor.busy()) return null;
    const snapshot = this.snapshot();
    if (!snapshot) return null;
    const revision = this.revision;
    this.saving.set(true);
    try {
      await this.repository.save(snapshot);
      if (this.current()?.id === snapshot.id && revision === this.revision) {
        this.current.set(snapshot);
        this.changed.set(false);
      }
      return snapshot.id;
    } catch (error: unknown) {
      this.changed.set(true);
      throw error;
    } finally {
      this.saving.set(false);
    }
  }
}
