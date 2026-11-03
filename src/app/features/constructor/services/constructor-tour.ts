import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { FabricImage, FabricObject, Rect, Textbox } from 'fabric';
import { ConstructorDocument } from '../interfaces/constructor-document';
import { blankDesign } from '../helpers/preview-to-design';
import { identifyObject } from '../helpers/fabric-metadata';
import { JoyrideStep } from '../../../shared/ui/joyride/joyride';
import { ConstructorSession } from './constructor-session';
import { ConstructorEditor } from './constructor-editor';

export const CONSTRUCTOR_TOUR_KEY = 'cv-builder.constructor-tour.v1';

@Injectable()
export class ConstructorTour {
  private readonly session = inject(ConstructorSession);
  private readonly editor = inject(ConstructorEditor);
  private readonly destroyRef = inject(DestroyRef);
  readonly active = signal(false);
  readonly restoring = signal(false);
  private attempted = false;
  private original: ConstructorDocument | null = null;
  private originalDirty = false;
  private originalPage = 0;
  private originalUndo: readonly string[] = [];
  private originalRedo: readonly string[] = [];
  private originalZoom = 1;
  private readonly examples: string[] = [];
  readonly steps: readonly (JoyrideStep & { readonly previewContextMenu?: boolean })[] = [
    { target: 'canvas', title: 'Welcome to the constructor', description: 'Design on an A4 page. These three examples are temporary; your design will return when you finish or skip this tour.' },
    { target: 'tools', title: 'Create and select elements', description: 'Select and move objects, copy a style, draw freehand, add text, insert an image, or choose a shape.' },
    { target: 'properties', title: 'Rectangle properties', description: 'This rectangle is selected. Adjust its fill, gradient, border, and corners in Properties. Drag it on the page to move it, or use its handles to resize.' },
    { target: 'properties', title: 'Image properties', description: 'The logo is an image. Adjust image effects, framing, and borders here. Use Insert image to upload your own, or Replace image to keep an existing frame.' },
    { target: 'typography', title: 'Text and typography', description: 'This text is selected. Choose its font, size, weight, alignment, and color in the toolbar. Double-click text on the page to edit it.' },
    { target: 'layers', title: 'Organize your layers', description: 'Select and rename elements in Layers, or expand a group to see its contents. Objects higher in the list appear in front. Use Properties to lock a selected object.' },
    { target: 'constructor-context-menu', title: 'Context menu', previewContextMenu: true, description: 'This is the context menu. Right-click an object on the canvas or a row in Layers to open it. Copy, cut, paste, group or ungroup objects, and bring elements forward or send them backward. Right-click empty canvas space to paste copied elements.' },
    { target: 'page-properties', title: 'File and page properties', description: 'Name your file and change the page background here. Drag guides from the rulers to align your design.' },
    { target: 'icons', title: 'Add icons', description: 'Search the icon library and insert an icon into your design. Its appearance can be edited in Properties.' },
    { target: 'pages', title: 'Pages and zoom', description: 'Switch pages or add a new page with the plus button. Use Fit page or a zoom level in the toolbar to inspect your work.' },
    { target: 'history', title: 'Undo and redo', description: 'Undo or redo edits with these buttons, or use Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z.' },
    { target: 'file', title: 'Save and export', description: 'File contains Save, Import, Export PDF, and Export Design File. Save keeps your work in this browser; export a design file for an editable backup. View lets you show or hide panels. Finish to return to your design.' },
  ];

  async start(restart = false): Promise<void> {
    if ((!restart && this.attempted) || !this.session.document() || this.active() || this.restoring()) return;
    this.attempted = true;
    try { if (!restart && localStorage.getItem(CONSTRUCTOR_TOUR_KEY) === 'done') return; } catch { /* Session-only when storage is unavailable. */ }
    this.original = this.session.snapshot();
    this.originalDirty = this.session.dirty();
    this.originalPage = this.session.activePage();
    this.originalUndo = this.editor.undoCount();
    this.originalRedo = this.editor.redoCount();
    this.originalZoom = this.editor.zoom();
    this.examples.length = 0;
    const rectangle = new Rect({ left: 140, top: 160, originX: 'left', originY: 'top', width: 480, height: 180, fill: '#d1faff', rx: 16, ry: 16 });
    const text = new Textbox('Make your own CV', { left: 140, top: 540, originX: 'left', originY: 'top', width: 480, fontFamily: 'Inter', fontSize: 36, fill: '#0f172a' });
    const logo = await FabricImage.fromURL('usense-logo.svg');
    if (this.destroyRef.destroyed) return;
    // Embed a raster copy so the sample obeys the same validation as user images.
    const image = await FabricImage.fromURL(logo.toDataURL({ format: 'png', multiplier: 2 }));
    if (this.destroyRef.destroyed) return;
    image.set({ left: 140, top: 390, originX: 'left', originY: 'top' });
    image.scaleToHeight(120);
    const objects: FabricObject[] = [rectangle, image, text];
    for (const [index, object] of objects.entries()) {
      identifyObject(object, ['Tutorial rectangle', 'Tutorial image', 'Tutorial text'][index]);
      this.examples.push(object.designId!);
    }
    const design = blankDesign();
    await this.session.open({ ...design, title: 'Constructor tutorial', pages: [{ ...design.pages[0], scene: JSON.stringify({ objects: objects.map((object) => object.toObject()), background: '#ffffff' }) }] });
    this.active.set(true);
  }

  selectStep(index: number): void {
    if (this.steps[index]?.previewContextMenu) this.editor.select(this.examples[0]);
    else if (index >= 2 && index <= 4) this.editor.select(this.examples[index - 2]);
  }

  hasUnsavedOriginal(): boolean {
    return this.active() && this.originalDirty;
  }

  async finish(): Promise<void> {
    if (this.restoring()) return;
    this.restoring.set(true);
    try {
      if (this.original) {
        await this.session.open(this.original, this.originalDirty);
        if (this.originalPage > 0) await this.session.switchPage(this.originalPage);
        this.editor.restoreUndoHistory(this.originalUndo, this.originalRedo);
        this.editor.setZoom(this.originalZoom);
      }
      else this.session.close();
      try { localStorage.setItem(CONSTRUCTOR_TOUR_KEY, 'done'); } catch { /* Keep the current session usable. */ }
      this.active.set(false);
    } finally {
      this.restoring.set(false);
    }
  }
}
