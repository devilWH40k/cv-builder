import { JoyrideTargets } from 'angular-shared-ui/joyride';
import { LayersArrowUp, LayerArrowUp, LayerArrowDown, LayersArrowDown } from 'angular-shared-ui/icons';
import { ContextMenu, ContextMenuItem } from 'angular-shared-ui/context-menu';
import { ToastService } from 'angular-shared-ui/toast';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, viewChild } from '@angular/core';
import { Copy, Scissors, ClipboardPaste, Group, Ungroup } from 'lucide-angular';
import { ConstructorEditor } from '../../services/constructor-editor';

@Component({
  selector: 'app-constructor-object-menu',
  imports: [ContextMenu],
  template: '<app-context-menu [items]="items()" [compact]="true" label="Constructor objects" (opened)="menuOpened($event)" (selected)="choose($event)" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructorObjectMenu {
  private readonly editor = inject(ConstructorEditor);
  private readonly toasts = inject(ToastService);
  private readonly menu = viewChild.required(ContextMenu);
  private readonly tourTargets = inject(JoyrideTargets);
  private previewing = false;
  private unregisterPreview: (() => void) | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.unregisterPreview?.());
  }

  protected menuOpened(panel: HTMLElement): void {
    if (this.previewing) this.unregisterPreview = this.tourTargets.register('constructor-context-menu', panel);
  }
  protected readonly items = computed<readonly ContextMenuItem[]>(() => [
    { id: 'copy', label: 'Copy', icon: Copy, disabled: this.editor.busy() || !this.editor.selectionCount() },
    { id: 'cut', label: 'Cut', icon: Scissors, disabled: this.editor.busy() || !this.editor.canCut() },
    { id: 'paste', label: 'Paste', icon: ClipboardPaste, disabled: this.editor.busy() || !this.editor.canPaste() },
    { id: 'group', label: 'Group (Ctrl+G)', icon: Group, separatorBefore: true, disabled: this.editor.busy() || !this.editor.canGroup() },
    { id: 'ungroup', label: 'Ungroup (Ctrl+Shift+G)', icon: Ungroup, disabled: this.editor.busy() || !this.editor.canUngroup() },
    { id: 'front', label: 'Bring to front', icon: LayersArrowUp, separatorBefore: true, disabled: this.editor.busy() || !this.editor.selectionCount() },
    { id: 'forward', label: 'Bring forward', icon: LayerArrowUp, disabled: this.editor.busy() || !this.editor.selectionCount() },
    { id: 'backward', label: 'Send backward', icon: LayerArrowDown, disabled: this.editor.busy() || !this.editor.selectionCount() },
    { id: 'back', label: 'Send to back', icon: LayersArrowDown, disabled: this.editor.busy() || !this.editor.selectionCount() },
  ]);

  open(event: MouseEvent, layerId?: string): void {
    if (this.editor.busy()) return;
    this.editor.selectContext(event, layerId);
    this.menu().open(event);
  }

  showPreview(x: number, y: number): void {
    this.previewing = true;
    this.menu().openPreview(x, y);
  }

  closePreview(): void {
    this.previewing = false;
    this.unregisterPreview?.();
    this.unregisterPreview = null;
    this.menu().close(false);
  }

  protected async choose(action: string): Promise<void> {
    if (action === 'group' || action === 'ungroup') {
      this.editor[action]();
      return;
    }
    if (action === 'front' || action === 'forward' || action === 'backward' || action === 'back') {
      this.editor.reorder(action);
      return;
    }
    if (action !== 'copy' && action !== 'cut' && action !== 'paste') return;
    try { await this.editor[action](); }
    catch { this.toasts.show('danger', 'The clipboard action could not be completed. Please try again.'); }
  }
}
