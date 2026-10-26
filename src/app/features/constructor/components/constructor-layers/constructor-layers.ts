import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { SelectionProperties } from '../../interfaces/constructor-document';
import { Check, ChevronDown, ChevronRight } from 'lucide-angular';
import { LucideAngularModule, Lock, Type, Image, Square, Circle, Minus, Pencil, Layers, Shapes } from 'lucide-angular';
import { ConstructorEditor } from '../../services/constructor-editor';
@Component({
  selector: 'app-constructor-layers',
  imports: [LucideAngularModule],
  templateUrl: './constructor-layers.html',
  styleUrl: './constructor-layers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructorLayers {
  readonly contextRequested = output<{ event: MouseEvent; layerId: string }>();
  protected readonly editor = inject(ConstructorEditor);
  protected readonly LockIcon = Lock;
  protected readonly ChevronDownIcon = ChevronDown;
  protected readonly ChevronRightIcon = ChevronRight;
  protected readonly RenameIcon = Pencil;
  protected readonly CheckIcon = Check;
  protected readonly renamingId = signal<string | null>(null);
  protected readonly renameDraft = signal('');
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('layerName');
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());
  protected readonly rows = computed(() => {
    const visit = (layers: readonly SelectionProperties[], depth: number): { layer: SelectionProperties; depth: number }[] =>
      layers.flatMap((layer) => [{ layer, depth },
        ...(layer.children && this.expanded().has(layer.id) ? visit(layer.children, depth + 1) : [])]);
    return visit(this.editor.layers(), 0);
  });

  constructor() {
    afterRenderEffect(() => {
      const input = this.nameInput()?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  protected startRename(layer: SelectionProperties): void {
    this.renameDraft.set(layer.label);
    this.renamingId.set(layer.id);
  }

  protected finishRename(id: string): void {
    if (this.renamingId() !== id) return;
    this.editor.renameLayer(id, this.renameDraft());
    this.renamingId.set(null);
  }

  protected cancelRename(): void {
    this.renamingId.set(null);
  }

  protected toggleGroup(id: string): void {
    this.expanded.update((current) => {
      const expanded = new Set(current);
      if (expanded.has(id)) expanded.delete(id);
      else expanded.add(id);
      return expanded;
    });
  }
  protected readonly layerIcons = {
    text: Type, image: Image, rectangle: Square, circle: Circle,
    line: Minus, drawing: Pencil, group: Layers, shape: Shapes,
  };
}
