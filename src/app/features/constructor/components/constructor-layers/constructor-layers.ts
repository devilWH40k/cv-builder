import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
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
  protected readonly layerIcons = {
    text: Type, image: Image, rectangle: Square, circle: Circle,
    line: Minus, drawing: Pencil, group: Layers, shape: Shapes,
  };
}
