import { ChangeDetectionStrategy, Component, PendingTasks, computed, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ConstructorEditor } from '../../services/constructor-editor';
import { ConstructorIcons, LibraryIcon } from '../../services/constructor-icons';

@Component({
  selector: 'app-constructor-icon-library',
  imports: [LucideAngularModule],
  templateUrl: './constructor-icon-library.html',
  styleUrl: './constructor-icon-library.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructorIconLibrary {
  protected readonly editor = inject(ConstructorEditor);
  private readonly catalog = inject(ConstructorIcons);
  private readonly pendingTasks = inject(PendingTasks);
  readonly icons = signal<readonly LibraryIcon[]>([]);
  readonly query = signal('');
  readonly loading = signal(true);
  readonly inserting = signal(false);
  readonly error = signal('');
  private readonly batchSize = 50;
  private readonly visibleCount = signal(this.batchSize);
  readonly filtered = computed(() => {
    const words = this.query().trim().toLowerCase().split(/\s+/);
    return this.icons().filter(icon => words.every(word =>
      `${icon.label} ${icon.name}`.toLowerCase().includes(word)));
  });
  readonly visibleIcons = computed(() => this.filtered().slice(0, this.visibleCount()));
  readonly hasMore = computed(() => this.visibleIcons().length < this.filtered().length);

  constructor() { this.load(); }

  setQuery(query: string): void {
    this.query.set(query);
    this.visibleCount.set(this.batchSize);
  }

  loadMore(): void {
    this.visibleCount.update(count => count + this.batchSize);
  }

  load(): void {
    void this.pendingTasks.run(async () => {
      this.loading.set(true);
      this.error.set('');
      try { this.icons.set(await this.catalog.load()); }
      catch { this.error.set('Could not load icons. Please try again.'); }
      finally { this.loading.set(false); }
    });
  }

  async add(icon: LibraryIcon): Promise<void> {
    if (this.editor.busy() || this.inserting()) return;
    this.inserting.set(true);
    this.error.set('');
    try { await this.editor.addIcon(icon.label, icon.data); }
    catch { this.error.set('Could not add this icon. Please try again.'); }
    finally { this.inserting.set(false); }
  }
}
