import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { Copy, Scissors, ClipboardPaste } from 'lucide-angular';
import { LayersArrowUp, LayerArrowUp, LayerArrowDown, LayersArrowDown } from '../../../../shared/ui/icons/layer-arrows';
import { ContextMenu, ContextMenuItem } from '../../../../shared/ui/context-menu/context-menu';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { ConstructorEditor } from '../../services/constructor-editor';

@Component({
  selector: 'app-constructor-object-menu',
  imports: [ContextMenu],
  template: '<app-context-menu [items]="items()" label="Constructor objects" (selected)="choose($event)" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructorObjectMenu {
  private readonly editor = inject(ConstructorEditor);
  private readonly toasts = inject(ToastService);
  private readonly menu = viewChild.required(ContextMenu);
  protected readonly items = computed<readonly ContextMenuItem[]>(() => [
    { id: 'copy', label: 'Copy', icon: Copy, disabled: this.editor.busy() || !this.editor.selectionCount() },
    { id: 'cut', label: 'Cut', icon: Scissors, disabled: this.editor.busy() || !this.editor.canCut() },
    { id: 'paste', label: 'Paste', icon: ClipboardPaste, disabled: this.editor.busy() || !this.editor.canPaste() },
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

  protected async choose(action: string): Promise<void> {
    if (action === 'front' || action === 'forward' || action === 'backward' || action === 'back') {
      this.editor.reorder(action);
      return;
    }
    if (action !== 'copy' && action !== 'cut' && action !== 'paste') return;
    try { await this.editor[action](); }
    catch { this.toasts.show('danger', 'The clipboard action could not be completed. Please try again.'); }
  }
}
