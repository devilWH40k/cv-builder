import { computed, inject, Injectable, signal } from '@angular/core';
import {
  Canvas,
  Circle,
  Color,
  FabricImage,
  FabricObject,
  Gradient,
  IText,
  PencilBrush,
  Point,
  Rect,
  Textbox,
  Transform,
  ActiveSelection,
  util,
} from 'fabric';
import {
  A4_HEIGHT,
  A4_WIDTH,
  ConstructorPage,
  ConstructorTool,
  ObjectAlignment,
  SelectionProperties,
  ImageEffects,
} from '../interfaces/constructor-document';
import { fileDataUrl, safeDesignLink } from '../helpers/design-assets';
import { identifyObject } from '../helpers/fabric-metadata';
import { validateDesignScene } from '../helpers/design-validation';
import { boundsGuides, PAGE_PADDING, snapAxis } from '../helpers/design-snapping';
import { EffectCircle, EffectRect } from '../helpers/effect-shapes';
import { applyImageEffects, imageEffects } from '../helpers/image-effects';
import { ConstructorClipboard } from './constructor-clipboard';
import { LayoutTextbox } from '../helpers/layout-textbox';
import { applyVisualStyle, captureVisualStyle, VisualStyle } from '../helpers/visual-style';
import { restoreDesignScene } from '../helpers/restore-design-scene';

/** Owns live Fabric objects. Components consume snapshots and issue editor commands. */
@Injectable()
export class ConstructorEditor {
  private canvas: Canvas | null = null;
  private readonly clipboard = inject(ConstructorClipboard);
  readonly selectionCount = signal(0);
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly canCut = signal(false);
  readonly canPaste = computed(() => this.clipboard.count() > 0);
  private readonly selected = signal<SelectionProperties | null>(null);
  private readonly objectList = signal<readonly SelectionProperties[]>([]);
  private readonly past = signal<readonly string[]>([]);
  private readonly future = signal<readonly string[]>([]);
  private restoring = false;
  private lastScene = '';
  private revisionCallback: (() => void) | null = null;
  private readonly historyLimit = 60;
  private guides: { x?: number; y?: number } = {};
  private capturedStyle: VisualStyle | null = null;
  private styleSourceId: string | null = null;
  readonly selection = this.selected.asReadonly();
  readonly layers = this.objectList.asReadonly();
  readonly undoCount = this.past.asReadonly();
  readonly redoCount = this.future.asReadonly();
  readonly tool = signal<ConstructorTool>('select');
  readonly zoom = signal(0.8);
  readonly busy = signal(false);
  readonly restoringHistory = signal(false);
  readonly clipboardBusy = signal(false);
  readonly brushColor = signal('#111827');
  readonly brushWidth = signal(3);
  readonly backgroundColor = signal('#ffffff');
  readonly hasBackgroundImage = signal(false);

  attach(element: HTMLCanvasElement, onChange: () => void): void {
    this.revisionCallback = onChange;
    this.canvas = new Canvas(element, {
      width: A4_WIDTH,
      height: A4_HEIGHT,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
      enablePointerEvents: true,
      stopContextMenu: false,
    });
    this.canvas.upperCanvasEl.setAttribute(
      'aria-label',
      'Design canvas. Select objects with the layers panel. Double-click text to edit.',
    );
    this.canvas.upperCanvasEl.tabIndex = 0;
    this.canvas.wrapperEl.style.marginInline = 'auto';
    for (const event of ['selection:created', 'selection:updated', 'selection:cleared'] as const) {
      this.canvas.on(event, () => this.refreshSelection());
    }
    this.canvas.on('object:modified', () => this.commit());
    this.canvas.on('mouse:down:before', ({ target, e }) => {
      if (this.tool() !== 'style' || !target || ('button' in e && e.button !== 0)) return;
      this.paintStyle(target);
    });
    this.canvas.on('object:moving', ({ target, e }) => this.snapMove(target, e.altKey));
    this.canvas.on('object:scaling', ({ target, transform, e }) => this.snapSize(target, transform, e.altKey));
    this.canvas.on('object:resizing', ({ target, transform, e }) => this.snapSize(target, transform, e.altKey));
    this.canvas.on('mouse:up', () => {
      this.guides = {};
      this.canvas?.requestRenderAll();
    });
    this.canvas.on('after:render', ({ ctx }) => this.drawGuides(ctx));
    this.canvas.on('text:changed', () => {
      this.refreshSelection();
      this.revisionCallback?.();
    });
    this.canvas.on('text:editing:exited', () => this.commit());
    this.canvas.on('path:created', ({ path }) => {
      identifyObject(path, 'Drawing');
      this.commit();
    });
    this.setZoom(this.zoom());
    this.lastScene = this.snapshot();
  }

  async dispose(): Promise<void> {
    const canvas = this.canvas;
    this.canvas = null;
    this.revisionCallback = null;
    await canvas?.dispose();
  }

  async load(page: ConstructorPage): Promise<void> {
    validateDesignScene(page.scene);
    if (!this.canvas) return;
    this.restoring = true;
    this.busy.set(true);
    try {
      await this.canvas.loadFromJSON(page.scene);
      this.canvas.discardActiveObject();
      this.canvas.requestRenderAll();
      this.past.set([]);
      this.future.set([]);
      this.setTool('select');
      this.refreshSelection();
      this.lastScene = this.snapshot();
    } finally {
      this.restoring = false;
      this.busy.set(false);
    }
  }

  snapshot(): string {
    return JSON.stringify(this.canvas?.toObject() ?? { objects: [], background: '#ffffff' });
  }

  finishEditing(): void {
    const active = this.canvas?.getActiveObject();
    if (active instanceof IText && active.isEditing) active.exitEditing();
    this.commit();
  }

  setZoom(value: number): void {
    if (!Number.isFinite(value)) return;
    const zoom = Math.min(2, Math.max(0.25, value));
    this.zoom.set(zoom);
    this.canvas?.setDimensions({ width: A4_WIDTH * zoom, height: A4_HEIGHT * zoom });
    this.canvas?.setZoom(zoom);
  }

  setTool(tool: ConstructorTool): void {
    if (tool === 'style') {
      if (this.selectionCount() !== 1 || this.busy() || !this.canvas?.getActiveObject()) return;
      this.finishEditing();
      const source = this.canvas.getActiveObject()!;
      this.capturedStyle = captureVisualStyle(source);
      this.styleSourceId = source.designId ?? null;
    } else {
      this.capturedStyle = null;
      this.styleSourceId = null;
    }
    this.finishEditing();
    this.tool.set(tool);
    if (!this.canvas) return;
    this.canvas.isDrawingMode = tool === 'draw';
    this.canvas.defaultCursor = tool === 'style' ? 'copy' : 'default';
    this.canvas.hoverCursor = tool === 'style' ? 'copy' : 'move';
    if (tool === 'draw') {
      this.canvas.discardActiveObject();
      const brush = new PencilBrush(this.canvas);
      brush.color = this.brushColor();
      brush.width = this.brushWidth();
      this.canvas.freeDrawingBrush = brush;
    }
  }

  setBrush(color: string, width: number): void {
    if (!/^#[a-f0-9]{6}$/i.test(color) || !Number.isFinite(width)) return;
    this.brushColor.set(color);
    this.brushWidth.set(Math.max(1, Math.min(40, width)));
    if (this.canvas?.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.color = color;
      this.canvas.freeDrawingBrush.width = this.brushWidth();
    }
  }

  addText(): void {
    this.add(
      new LayoutTextbox('Your text', {
        left: 80,
        top: 80,
        width: 260,
        fontFamily: 'Roboto',
        fontSize: 24,
        fill: '#111827',
        originX: 'left',
        originY: 'top',
      }),
      'Text',
    );
  }

  addShape(shape: 'rectangle' | 'circle' | 'line'): void {
    const options = {
      left: 80,
      top: 100,
      fill: '#36d4f7',
      originX: 'left',
      originY: 'top',
    } as const;
    this.add(
      shape === 'circle'
        ? new EffectCircle({ ...options, radius: 50 })
        : new EffectRect({ ...options, width: 180, height: shape === 'line' ? 3 : 100 }),
      shape === 'circle' ? 'Circle' : shape === 'line' ? 'Line' : 'Rectangle',
    );
  }

  async addImage(file: File): Promise<void> {
    const image = await this.readImage(file);
    image.set({ left: 80, top: 100, originX: 'left', originY: 'top' });
    image.scaleToWidth(Math.min(300, image.width));
    this.add(image, file.name);
  }

  setBackgroundColor(color: string): void {
    if (!this.canvas || this.busy() || !/^#[a-f0-9]{6}$/i.test(color)) return;
    this.canvas.backgroundColor = color;
    this.commit();
  }

  async setBackgroundImage(file: File): Promise<void> {
    if (!this.canvas || this.busy()) return;
    const canvas = this.canvas;
    this.busy.set(true);
    try {
      const image = await this.readImage(file);
      if (canvas !== this.canvas) return;
      const scale = Math.max(A4_WIDTH / image.width, A4_HEIGHT / image.height);
      image.set({
        originX: 'left', originY: 'top',
        left: (A4_WIDTH - image.width * scale) / 2,
        top: (A4_HEIGHT - image.height * scale) / 2,
        scaleX: scale, scaleY: scale,
        objectCaching: false,
      });
      canvas.backgroundImage = image;
      this.commit();
    } finally {
      this.busy.set(false);
    }
  }

  removeBackgroundImage(): void {
    if (!this.canvas || this.busy()) return;
    this.canvas.backgroundImage = undefined;
    this.commit();
  }

  private async readImage(file: File): Promise<FabricImage> {
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 10 * 1024 ** 2
    ) {
      throw new Error('Choose a PNG, JPEG or WebP image up to 10 MB.');
    }
    const source = await fileDataUrl(file);
    const image = await FabricImage.fromURL(source);
    if (image.width * image.height > 40_000_000)
      throw new Error('Choose an image smaller than 40 megapixels.');
    return image;
  }

  select(id: string): void {
    const object = this.canvas?.getObjects().find((object) => object.designId === id);
    if (object && this.canvas) {
      if (this.tool() === 'style') { this.paintStyle(object); return; }
      this.setTool('select');
      this.canvas.setActiveObject(object);
      this.canvas.requestRenderAll();
      this.refreshSelection();
    }
  }

  private paintStyle(target: FabricObject): void {
    if (!this.capturedStyle || target.designId === this.styleSourceId || target.lockMovementX) return;
    const style = this.capturedStyle;
    this.setTool('select');
    applyVisualStyle(style, target);
    this.canvas?.discardActiveObject();
    this.canvas?.setActiveObject(target);
    this.commit();
  }

  selectAll(): void {
    if (!this.canvas || this.busy()) return;
    this.setTool('select');
    this.canvas.discardActiveObject();
    const objects = this.canvas.getObjects().filter((object) => object.visible && object.selectable);
    if (objects.length)
      this.canvas.setActiveObject(objects.length === 1 ? objects[0] : new ActiveSelection(objects, { canvas: this.canvas }));
    this.refreshSelection();
    this.canvas.requestRenderAll();
  }

  selectContext(event: MouseEvent, layerId?: string): void {
    if (!this.canvas || this.busy()) return;
    const target = layerId
      ? this.canvas.getObjects().find((object) => object.designId === layerId)
      : this.canvas.findTarget(event).target;
    const active = this.canvas.getActiveObject();
    if (target && (target === active || this.canvas.getActiveObjects().includes(target))) return;
    this.finishEditing();
    this.canvas.discardActiveObject();
    if (target) this.canvas.setActiveObject(target);
    this.refreshSelection();
    this.canvas.requestRenderAll();
  }

  updateText(update: {
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    textAlign?: string;
  }): void {
    this.modify((object) => {
      if (!(object instanceof IText)) return;
      if (update.fontSize !== undefined && Number.isFinite(update.fontSize)) {
        object.removeStyle('fontSize');
        object.set('fontSize', Math.min(120, Math.max(6, update.fontSize)));
      }
      if (update.bold !== undefined) {
        object.removeStyle('fontWeight');
        object.set('fontWeight', update.bold ? 'bold' : 'normal');
      }
      if (update.italic !== undefined) {
        object.removeStyle('fontStyle');
        object.set('fontStyle', update.italic ? 'italic' : 'normal');
      }
      if (update.textAlign && ['left', 'center', 'right', 'justify'].includes(update.textAlign))
        object.set('textAlign', update.textAlign);
    });
  }

  setFill(color: string, gradientEnd: string | null = null): void {
    if (!/^#[a-f0-9]{6}$/i.test(color) || (gradientEnd && !/^#[a-f0-9]{6}$/i.test(gradientEnd)))
      return;
    this.modify((object) => {
      const fill = gradientEnd
        ? new Gradient({
            type: 'linear',
            gradientUnits: 'percentage',
            coords: { x1: 0, y1: 0, x2: 1, y2: 0 },
            colorStops: [
              { offset: 0, color },
              { offset: 1, color: gradientEnd },
            ],
          })
        : color;
      if (object.type === 'path') object.set('stroke', fill);
      else {
        if (object instanceof IText) object.removeStyle('fill');
        object.set('fill', fill);
      }
    });
  }

  setLink(value: string): void {
    const url = value.trim() ? safeDesignLink(value) : '';
    if (url === null) throw new Error('Use an https://, http://, mailto: or tel: link.');
    this.modify((object) => {
      object.linkUrl = url;
    });
  }

  updateRectangle(update: { borderRadius?: number; borderColor?: string; borderWidth?: number }): void {
    this.modify((object) => {
      if (!(object instanceof Rect)) return;
      if (update.borderRadius !== undefined && Number.isFinite(update.borderRadius)) {
        const radius = Math.max(0, Math.min(update.borderRadius, object.width / 2, object.height / 2));
        object.set({ rx: radius, ry: radius });
      }
      if (update.borderColor && /^#[a-f0-9]{6}$/i.test(update.borderColor))
        object.set('stroke', update.borderColor);
      if (update.borderWidth !== undefined && Number.isFinite(update.borderWidth)) {
        object.set('strokeWidth', Math.max(0, Math.min(100, update.borderWidth)));
        if (!object.stroke) object.set('stroke', '#111827');
      }
    });
  }

  setBlur(value: number): void {
    if (!Number.isFinite(value)) return;
    this.modify((object) => {
      if (!(object instanceof Rect || object instanceof Circle)) return;
      object.designBlur = Math.max(0, Math.min(40, value));
      object.set('dirty', true);
    });
  }

  updateImageEffects(update: Partial<ImageEffects>): void {
    this.modify((object) => {
      if (object instanceof FabricImage) applyImageEffects(object, update);
    });
  }

  remove(): void {
    const objects = this.canvas?.getActiveObjects().filter((object) => !object.lockMovementX) ?? [];
    if (!objects.length) return;
    this.canvas?.discardActiveObject();
    this.canvas?.remove(...objects);
    this.commit();
  }

  async duplicate(): Promise<void> {
    if (this.busy() || !this.canvas) return;
    this.finishEditing();
    this.clipboardBusy.set(true);
    this.busy.set(true);
    try { this.insertCopies(await this.copySelection(), 16); }
    finally { this.busy.set(false); this.clipboardBusy.set(false); }
  }

  async copy(): Promise<void> {
    if (this.busy() || !this.selectionCount()) return;
    this.finishEditing();
    this.clipboardBusy.set(true);
    this.busy.set(true);
    try { this.clipboard.write(await this.copySelection()); }
    finally { this.busy.set(false); this.clipboardBusy.set(false); }
  }

  async cut(): Promise<void> {
    if (this.busy() || !this.canvas || !this.canCut()) return;
    this.finishEditing();
    const canvas = this.canvas;
    const selected = canvas.getActiveObjects();
    this.clipboardBusy.set(true);
    this.busy.set(true);
    try {
      const copies = await this.copySelection();
      if (canvas !== this.canvas) return;
      this.clipboard.write(copies);
      canvas.discardActiveObject();
      canvas.remove(...selected);
      this.commit();
    } finally { this.busy.set(false); this.clipboardBusy.set(false); }
  }

  async paste(): Promise<void> {
    if (this.busy() || !this.canvas || !this.canPaste()) return;
    this.finishEditing();
    this.clipboardBusy.set(true);
    this.busy.set(true);
    try {
      const { objects, offset } = await this.clipboard.read();
      this.insertCopies(objects, offset);
    } finally { this.busy.set(false); this.clipboardBusy.set(false); }
  }

  private async copySelection(): Promise<FabricObject[]> {
    const selected = new Set(this.canvas?.getActiveObjects() ?? []);
    const objects = (this.canvas?.getObjects() ?? []).filter((object) => selected.has(object));
    const transforms = objects.map((object) => object.calcTransformMatrix());
    const copies = await Promise.all(objects.map((object) => object.clone()));
    copies.forEach((copy, index) => util.applyTransformToObject(copy, transforms[index]));
    return copies;
  }

  private insertCopies(objects: FabricObject[], offset: number): void {
    if (!this.canvas || !objects.length) return;
    this.setTool('select');
    this.canvas.discardActiveObject();
    for (const object of objects) {
      object.designId = crypto.randomUUID();
      object.set({ left: object.left + offset, top: object.top + offset });
      this.canvas.add(object);
    }
    this.canvas.setActiveObject(objects.length === 1 ? objects[0] : new ActiveSelection(objects, { canvas: this.canvas }));
    this.commit();
  }

  align(alignment: ObjectAlignment): void {
    this.modify((object) => {
      const bounds = object.getBoundingRect();
      const target =
        alignment === 'left'
          ? 32
          : alignment === 'center'
            ? (A4_WIDTH - bounds.width) / 2
            : A4_WIDTH - bounds.width - 32;
      object.setXY(object.getXY().add(new Point(target - bounds.left, 0)));
    });
  }

  reorder(direction: 'front' | 'forward' | 'backward' | 'back'): void {
    if (!this.canvas || this.busy()) return;
    const selected = new Set(this.canvas.getActiveObjects());
    const objects = this.canvas.getObjects().filter((object) => selected.has(object));
    if (direction === 'back' || direction === 'forward') objects.reverse();
    for (const object of objects) {
      if (direction === 'front') this.canvas.bringObjectToFront(object);
      else if (direction === 'back') this.canvas.sendObjectToBack(object);
      else {
        const stack = this.canvas.getObjects();
        const next = stack[stack.indexOf(object) + (direction === 'forward' ? 1 : -1)];
        if (!next || selected.has(next)) continue;
        if (direction === 'forward') this.canvas.bringObjectForward(object);
        else this.canvas.sendObjectBackwards(object);
      }
    }
    this.commit();
  }

  toggleLock(): void {
    const object = this.canvas?.getActiveObject();
    if (!object) return;
    const locked = !object.lockMovementX;
    object.set({
      lockMovementX: locked,
      lockMovementY: locked,
      lockScalingX: locked,
      lockScalingY: locked,
      lockRotation: locked,
      hasControls: !locked,
      ...(object instanceof IText ? { editable: !locked } : {}),
    });
    this.commit();
  }

  nudge(x: number, y: number): void {
    this.modify((object) => {
      object.setXY(object.getXY().add(new Point(x, y)));
    });
  }

  async undo(): Promise<void> {
    await this.restoreHistory('undo');
  }
  async redo(): Promise<void> {
    await this.restoreHistory('redo');
  }

  private add(object: FabricObject, label: string): void {
    if (!this.canvas) return;
    this.setTool('select');
    identifyObject(object, label);
    this.canvas.add(object);
    this.canvas.setActiveObject(object);
    this.commit();
  }

  private snapTargets(target: FabricObject): FabricObject[] {
    const selected = new Set(this.canvas?.getActiveObjects() ?? []);
    return (this.canvas?.getObjects() ?? []).filter((object) =>
      object !== target && !selected.has(object) && object.visible && object.designLabel !== 'Background',
    );
  }

  private snapMove(target: FabricObject, bypass = false): void {
    this.guides = {};
    if (!this.canvas || bypass) return;
    target.setCoords();
    const bounds = target.getBoundingRect();
    const others = this.snapTargets(target).map((object) => object.getBoundingRect());
    const x = snapAxis(boundsGuides(bounds, 'x'), [0, PAGE_PADDING, A4_WIDTH / 2, A4_WIDTH - PAGE_PADDING, A4_WIDTH,
      ...others.flatMap((bounds) => boundsGuides(bounds, 'x'))], 6 / this.zoom());
    const y = snapAxis(boundsGuides(bounds, 'y'), [0, PAGE_PADDING, A4_HEIGHT / 2, A4_HEIGHT - PAGE_PADDING, A4_HEIGHT,
      ...others.flatMap((bounds) => boundsGuides(bounds, 'y'))], 6 / this.zoom());
    target.set({ left: target.left + (x?.delta ?? 0), top: target.top + (y?.delta ?? 0) });
    target.setCoords();
    this.guides = { x: x?.guide, y: y?.guide };
  }

  private snapSize(target: FabricObject, transform: Transform, bypass = false): void {
    this.guides = {};
    // Axis-aligned objects have an unambiguous page width/height and fixed opposite anchor.
    if (!this.canvas || bypass || target.angle % 360 !== 0 || target.skewX || target.skewY) return;
    target.setCoords();
    const bounds = target.getBoundingRect();
    const others = this.snapTargets(target).map((object) => object.getBoundingRect());
    const action = transform.action;
    const verticalTextResize = target instanceof Textbox && ['mt', 'mb'].includes(transform.corner);
    const width = action !== 'scaleY' && !verticalTextResize
      ? snapAxis([bounds.width], [A4_WIDTH - 2 * PAGE_PADDING, ...others.map((bounds) => bounds.width)], 6 / this.zoom()) : null;
    const height = action !== 'scaleX' && action !== 'resizing'
      ? snapAxis([bounds.height], [A4_HEIGHT - 2 * PAGE_PADDING, ...others.map((bounds) => bounds.height)], 6 / this.zoom()) : null;
    const anchor = target.getPointByOrigin(transform.originX, transform.originY);
    if (action === 'resizing' && target instanceof Textbox && width) {
      target.set('width', Math.max(8, target.width + width.delta / target.scaleX));
      target.initDimensions();
    } else if (action === 'scale') {
      const match = width && height ? (Math.abs(width.delta) < Math.abs(height.delta) ? width : height) : width ?? height;
      const dimension = match === width ? bounds.width : bounds.height;
      if (match && dimension > 0) {
        const factor = (dimension + match.delta) / dimension;
        target.set({ scaleX: target.scaleX * factor, scaleY: target.scaleY * factor });
      }
    } else {
      if (width && bounds.width > 0) target.set('scaleX', target.scaleX * (bounds.width + width.delta) / bounds.width);
      if (height && bounds.height > 0) target.set('scaleY', target.scaleY * (bounds.height + height.delta) / bounds.height);
    }
    target.setPositionByOrigin(anchor, transform.originX, transform.originY);
    target.setCoords();
    const snapped = target.getBoundingRect();
    this.guides = {
      x: width && Math.abs(snapped.width - width.guide) < 0.5 ? snapped.left + snapped.width : undefined,
      y: height && Math.abs(snapped.height - height.guide) < 0.5 ? snapped.top + snapped.height : undefined,
    };
  }

  private drawGuides(context: CanvasRenderingContext2D): void {
    if (!this.canvas) return;
    const zoom = this.zoom();
    context.save();
    context.strokeStyle = '#36d4f7';
    context.lineWidth = 1;
    context.setLineDash([4, 4]);
    context.beginPath();
    if (this.guides.x !== undefined) {
      context.moveTo(this.guides.x * zoom, 0);
      context.lineTo(this.guides.x * zoom, A4_HEIGHT * zoom);
    }
    if (this.guides.y !== undefined) {
      context.moveTo(0, this.guides.y * zoom);
      context.lineTo(A4_WIDTH * zoom, this.guides.y * zoom);
    }
    context.stroke();
    context.restore();
  }

  private modify(change: (object: FabricObject) => void): void {
    const objects = this.canvas?.getActiveObjects() ?? [];
    for (const object of objects) {
      if (object.lockMovementX) continue;
      change(object);
      object.setCoords();
    }
    // Programmatic child changes do not trigger Fabric's selection layout automatically.
    const active = this.canvas?.getActiveObject();
    if (active instanceof ActiveSelection) active.triggerLayout();
    this.commit();
  }

  private commit(): void {
    if (this.restoring || !this.canvas) return;
    const scene = this.snapshot();
    if (scene !== this.lastScene) {
      this.past.update((past) => [...past, this.lastScene].slice(-this.historyLimit));
      this.future.set([]);
      this.lastScene = scene;
      this.revisionCallback?.();
    }
    this.refreshSelection();
    this.canvas.requestRenderAll();
  }

  private async restoreHistory(direction: 'undo' | 'redo'): Promise<void> {
    if (!this.canvas || this.busy()) return;
    this.finishEditing();
    const from = direction === 'undo' ? this.past : this.future;
    const to = direction === 'undo' ? this.future : this.past;
    const scene = from().at(-1);
    if (!scene) return;
    const current = this.snapshot();
    this.restoring = true;
    this.restoringHistory.set(true);
    this.busy.set(true);
    try {
      await restoreDesignScene(this.canvas, current, scene);
      from.update((items) => items.slice(0, -1));
      to.update((items) => [...items, current]);
      this.lastScene = scene;
      this.refreshSelection();
      this.canvas.requestRenderAll();
      this.revisionCallback?.();
    } finally {
      this.restoring = false;
      this.busy.set(false);
      this.restoringHistory.set(false);
    }
  }

  private properties(object: FabricObject): SelectionProperties {
    const text = object instanceof IText ? object : null;
    const paint = object.type === 'path' ? object.stroke : object.fill;
    const gradient = paint instanceof Gradient ? paint : null;
    const hexColor = (color: string) => '#' + new Color(color).toHex();
    return {
      id: object.designId ?? '',
      label: text?.text || object.designLabel || object.type,
      kind: text ? 'text' : object instanceof FabricImage ? 'image'
        : object.type === 'path' ? 'drawing'
        : object.type === 'line' || object.designLabel === 'Line' ? 'line'
        : object instanceof Rect ? 'rectangle'
        : ['circle', 'ellipse'].includes(object.type) ? 'circle'
        : ['group', 'activeselection'].includes(object.type) ? 'group' : 'shape',
      isRectangle: object instanceof Rect,
      canBlur: object instanceof Rect || object instanceof Circle,
      blur: object.designBlur ?? 0,
      imageEffects: imageEffects(object instanceof FabricImage ? object : null),
      borderRadius: object instanceof Rect ? object.rx : 0,
      borderColor: hexColor(typeof object.stroke === 'string' ? object.stroke : '#111827'),
      borderWidth: object.strokeWidth,
      isText: !!text,
      isImage: object instanceof FabricImage,
      locked: object.lockMovementX,
      fontSize: text?.fontSize ?? 16,
      bold: text?.fontWeight === 'bold' || Number(text?.fontWeight) >= 600,
      italic: text?.fontStyle === 'italic',
      textAlign: text?.textAlign ?? 'left',
      color: hexColor(
        gradient?.colorStops[0]?.color ?? (typeof paint === 'string' ? paint : '#111827'),
      ),
      gradientEnd: gradient ? hexColor(gradient.colorStops.at(-1)?.color ?? '#36d4f7') : null,
      linkUrl: object.linkUrl ?? '',
    };
  }

  private refreshSelection(): void {
    const activeObjects = this.canvas?.getActiveObjects() ?? [];
    this.selectionCount.set(activeObjects.length);
    this.selectedIds.set(new Set(activeObjects.flatMap((object) => object.designId ? [object.designId] : [])));
    this.canCut.set(activeObjects.length > 0 && activeObjects.every((object) => !object.lockMovementX));
    const background = this.canvas?.backgroundColor;
    this.backgroundColor.set(typeof background === 'string' && background ? '#' + new Color(background).toHex() : '#ffffff');
    this.hasBackgroundImage.set(!!this.canvas?.backgroundImage);
    const objects = this.canvas?.getObjects() ?? [];
    objects.forEach((object) =>
      identifyObject(object, object instanceof IText ? object.text.slice(0, 40) : object.type),
    );
    this.objectList.set(objects.map((object) => this.properties(object)).reverse());
    const active = this.canvas?.getActiveObject();
    if (active && active.cornerSize !== 8) {
      active.set('cornerSize', 8);
      active.setCoords();
    }
    this.selected.set(active ? this.properties(active) : null);
  }
}
