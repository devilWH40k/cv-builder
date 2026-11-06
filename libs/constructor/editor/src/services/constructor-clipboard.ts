import { Injectable, signal } from '@angular/core';
import { FabricObject } from 'fabric';

/** Detached object copies shared across constructor pages and designs in this session. */
@Injectable({ providedIn: 'root' })
export class ConstructorClipboard {
  private objects: readonly FabricObject[] = [];
  private readonly objectCount = signal(0);
  readonly count = this.objectCount.asReadonly();
  private pasteNumber = 0;

  write(objects: readonly FabricObject[]): void {
    this.objects = objects;
    this.objectCount.set(objects.length);
    this.pasteNumber = 0;
  }

  async read(): Promise<{ objects: FabricObject[]; offset: number }> {
    const objects = await Promise.all(this.objects.map((object) => object.clone()));
    return { objects, offset: 16 * ++this.pasteNumber };
  }
}
