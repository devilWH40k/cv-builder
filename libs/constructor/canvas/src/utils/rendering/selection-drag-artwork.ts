import { ActiveSelection, FabricObject } from 'fabric';
import { canCacheArtwork, DragArtwork } from './drag-artwork';

interface SelectionLayer {
  readonly moving: boolean;
  readonly objects: FabricObject[];
  readonly artwork: DragArtwork;
}

/** Keep unselected artwork between selected objects in its original stack position. */
export class SelectionDragArtwork {
  private objects: FabricObject[] = [];
  private layers: SelectionLayer[] = [];

  dispose(): void {
    this.layers.forEach(layer => layer.artwork.dispose());
    this.layers = [];
    this.objects = [];
  }

  render(context: CanvasRenderingContext2D, selection: ActiveSelection, objects: FabricObject[]): boolean {
    if (this.objects.length !== objects.length || this.objects.some((object, index) => object !== objects[index])) {
      this.dispose();
    }
    if (!this.layers.length) {
      // Selected descendants still render through their original parents; keep that path live.
      if (!objects.length || selection.getObjects().some(object => object.parent || !objects.includes(object)) ||
        !objects.every(canCacheArtwork)) return false;
      const runs: { moving: boolean; objects: FabricObject[] }[] = [];
      for (const object of objects) {
        const moving = object.group === selection;
        const previous = runs.at(-1);
        if (previous?.moving === moving) previous.objects.push(object);
        else runs.push({ moving, objects: [object] });
      }
      // At most 48 MiB across all runs, with the usual 16 MiB limit for each preview.
      const maxPixels = Math.min(4 * 1024 ** 2, Math.floor(12 * 1024 ** 2 / runs.length));
      this.layers = runs.map(run => ({ ...run, artwork: new DragArtwork(maxPixels) }));
      this.objects = [...objects];
    }
    for (const layer of this.layers) {
      layer.artwork.render(context, layer.moving ? selection : layer.objects[0], layer.objects);
    }
    return true;
  }
}
