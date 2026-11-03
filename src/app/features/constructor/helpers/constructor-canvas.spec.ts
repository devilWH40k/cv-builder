import { ActiveSelection, Circle, Group, Rect } from 'fabric';
import { ConstructorCanvas } from './constructor-canvas';
import { EffectGroup, EffectRect } from './effect-shapes';

describe('Constructor gesture rendering', () => {
  let canvas: ConstructorCanvas;

  beforeEach(() => {
    canvas = new ConstructorCanvas(undefined, {
      width: 180, height: 160, enableRetinaScaling: false,
      renderOnAddRemove: false, preserveObjectStacking: true, skipControlsDrawing: true,
      backgroundColor: '#ffffff',
    });
  });
  afterEach(async () => { await canvas.dispose(); });

  const pixels = (canvas: ConstructorCanvas) =>
    Array.from(canvas.getContext().getImageData(0, 0, canvas.lowerCanvasEl.width, canvas.lowerCanvasEl.height).data);

  for (const { zoom, retina } of [{ zoom: 1, retina: 1 }, { zoom: 1.5, retina: 1 }, { zoom: 1, retina: 2 }]) {
    it(`reuses nested blur and preserves overlap at zoom ${zoom} and pixel ratio ${retina}`, () => {
      spyOn(canvas, 'getRetinaScaling').and.returnValue(retina);
      canvas.setDimensions({ width: 180, height: 160 });
      const blur = new EffectRect({ left: 15, top: 15, width: 50, height: 45, fill: '#ff0000', objectCaching: false });
      blur.designBlur = 6;
      const nested = new EffectGroup([new EffectGroup([blur])], { angle: 12, opacity: 0.7 });
      const moving = new Rect({ left: 25, top: 25, width: 50, height: 40, fill: '#00ff00' });
      const foreground = new Circle({ left: 40, top: 35, radius: 25, fill: '#0000ff', opacity: 0.5 });
      canvas.add(nested, moving, foreground);
      canvas.setZoom(zoom);
      const blurRender = spyOn(blur, 'render').and.callThrough();
      const foregroundRender = spyOn(foreground, 'render').and.callThrough();
      canvas.beginGesture(moving);
      for (let frame = 0; frame < 10; frame++) {
        moving.set({ left: 25 + frame, top: 25 + frame });
        moving.setCoords();
        canvas.renderAll();
      }
      expect(blurRender).toHaveBeenCalledTimes(1);
      expect(foregroundRender).toHaveBeenCalledTimes(1);
      const cached = pixels(canvas);
      canvas.endGesture();
      canvas.renderAll();
      const uncached = pixels(canvas);
      // Browser compositing of a transparent layer can round a channel by one unit.
      let difference = 0;
      cached.forEach((value, index) => { difference = Math.max(difference, Math.abs(value - uncached[index])); });
      expect(difference).toBeLessThanOrEqual(1);
      expect(blurRender).toHaveBeenCalledTimes(2);
    });
  }

  it('keeps the containing group live when dragging a nested child', () => {
    const child = new Rect({ left: 25, top: 25, width: 20, height: 20 });
    const nested = new Group([child], { subTargetCheck: true });
    const parent = new Group([nested], { subTargetCheck: true });
    const stationary = new Rect({ left: 100, top: 100, width: 10, height: 10 });
    canvas.add(parent, stationary);
    const activeRender = spyOn(parent, 'render').and.callThrough();
    const stationaryRender = spyOn(stationary, 'render').and.callThrough();
    canvas.beginGesture(child);
    canvas.renderAll();
    child.set('left', child.left + 5);
    canvas.renderAll();
    expect(activeRender).toHaveBeenCalledTimes(2);
    expect(stationaryRender).toHaveBeenCalledTimes(1);
  });

  for (const { zoom, retina } of [{ zoom: 1, retina: 1 }, { zoom: 1.5, retina: 1 }, { zoom: 1, retina: 2 }]) {
    for (const stationary of [false, true]) {
      it(`reuses three moving blurred shapes with stationary artwork ${stationary}, zoom ${zoom}, retina ${retina}`, () => {
        spyOn(canvas, 'getRetinaScaling').and.returnValue(retina);
        canvas.setDimensions({ width: 180, height: 160 });
        const shapes = [0, 1, 2].map(index => {
          const shape = new EffectRect({ left: -30 + index * 25, top: 20 + index * 15,
            width: 35, height: 30, fill: ['#ff0000', '#00ff00', '#0000ff'][index] });
          shape.designBlur = 6;
          return shape;
        });
        const group = new EffectGroup([new EffectGroup(shapes)], { angle: 12, opacity: 0.7 });
        if (stationary) canvas.add(new Rect({ left: 10, top: 10, width: 80, height: 80, fill: '#aaaaaa' }));
        canvas.add(group);
        if (stationary) canvas.add(new Circle({ left: 50, top: 50, radius: 25, fill: '#000000', opacity: 0.5 }));
        canvas.setZoom(zoom);
        const renders = shapes.map(shape => spyOn(shape, 'render').and.callThrough());
        canvas.beginGesture(group);
        for (let frame = 0; frame < 10; frame++) {
          group.set({ left: group.left + 2, top: group.top + 2 });
          group.setCoords();
          canvas.renderAll();
        }
        renders.forEach(render => expect(render).toHaveBeenCalledTimes(1));
        const cached = pixels(canvas);
        canvas.endGesture();
        canvas.renderAll();
        const normal = pixels(canvas);
        let difference = 0;
        cached.forEach((value, index) => { difference = Math.max(difference, Math.abs(value - normal[index])); });
        // Three overlapping translucent shapes round again when the preview is composited.
        expect(difference).toBeLessThanOrEqual(3);
        renders.forEach(render => expect(render).toHaveBeenCalledTimes(2));
      });
    }
  }

  it('refreshes moving blur after edits, zoom changes and a new gesture', () => {
    const shape = new EffectRect({ left: 30, top: 30, width: 40, height: 40, fill: '#ff0000' });
    shape.designBlur = 6;
    const group = new EffectGroup([shape]);
    canvas.add(group);
    const render = spyOn(shape, 'render').and.callThrough();
    canvas.beginGesture(group);
    canvas.renderAll();
    shape.set('fill', '#0000ff');
    canvas.renderAll();
    expect(render).toHaveBeenCalledTimes(2);
    canvas.setZoom(1.5);
    canvas.renderAll();
    expect(render).toHaveBeenCalledTimes(3);
    canvas.beginGesture(group);
    canvas.renderAll();
    expect(render).toHaveBeenCalledTimes(4);
  });

  it('keeps blurred shapes live during scaling and nested child dragging', () => {
    const shape = new EffectRect({ left: 30, top: 30, width: 40, height: 40 });
    shape.designBlur = 6;
    const group = new EffectGroup([shape]);
    canvas.add(group);
    const render = spyOn(shape, 'render').and.callThrough();
    canvas.beginGesture(group, 'scale');
    canvas.renderAll();
    canvas.setZoom(1.5);
    canvas.renderAll();
    canvas.beginGesture(shape);
    canvas.renderAll();
    shape.set('left', shape.left + 5);
    canvas.renderAll();
    expect(render).toHaveBeenCalledTimes(4);
  });

  it('renders a previously offscreen blurred group when it enters the page', () => {
    const shape = new EffectRect({ width: 30, height: 30, fill: '#ff0000' });
    shape.designBlur = 6;
    const group = new EffectGroup([shape], { left: -100, top: 40 });
    canvas.add(group);
    group.dirty = false;
    canvas.beginGesture(group);
    canvas.renderAll();
    group.set('left', 40);
    group.setCoords();
    canvas.renderAll();
    const preview = pixels(canvas);
    canvas.endGesture();
    canvas.renderAll();
    expect(pixels(canvas)).toEqual(preview);
    expect(canvas.getContext().getImageData(45, 45, 1, 1).data[1]).toBeLessThan(255);
  });

  for (const fallback of ['large artwork', 'blending', 'absolute clip'] as const) {
    it(`keeps live rendering for ${fallback}`, () => {
      const shape = new EffectRect({ left: 30, top: 30, width: fallback === 'large artwork' ? 9000 : 40, height: 40 });
      shape.designBlur = 6;
      if (fallback === 'blending') shape.set('globalCompositeOperation', 'destination-out');
      if (fallback === 'absolute clip') shape.set('clipPath', new Rect({ width: 80, height: 80, absolutePositioned: true }));
      const group = new EffectGroup([shape]);
      canvas.add(group);
      const render = spyOn(shape, 'render').and.callThrough();
      canvas.beginGesture(group);
      canvas.renderAll();
      canvas.renderAll();
      expect(render).toHaveBeenCalledTimes(2);
    });
  }

  it('refreshes stationary layers after zooming and when a new gesture starts', () => {
    const moving = new Rect({ width: 20, height: 20 });
    const stationary = new Rect({ left: 60, top: 60, width: 20, height: 20 });
    canvas.add(moving, stationary);
    const render = spyOn(stationary, 'render').and.callThrough();
    canvas.beginGesture(moving);
    canvas.renderAll();
    canvas.setZoom(1.5);
    canvas.renderAll();
    expect(render).toHaveBeenCalledTimes(2);
    canvas.endGesture();
    stationary.set('fill', '#0000ff');
    canvas.beginGesture(moving);
    canvas.renderAll();
    expect(render).toHaveBeenCalledTimes(3);
  });

  it('reuses stationary artwork for a multi-selection spanning layers', () => {
    const first = new Rect({ width: 20, height: 20 });
    const middle = new Rect({ left: 10, top: 10, width: 20, height: 20 });
    const last = new Rect({ left: 20, top: 20, width: 20, height: 20 });
    canvas.add(first, middle, last);
    const selection = new ActiveSelection([first, last], { canvas });
    canvas.setActiveObject(selection);
    const render = spyOn(middle, 'render').and.callThrough();
    canvas.beginGesture(selection);
    canvas.renderAll();
    canvas.renderAll();
    expect(render).toHaveBeenCalledTimes(1);
    const preview = pixels(canvas);
    canvas.endGesture();
    canvas.renderAll();
    expect(pixels(canvas)).toEqual(preview);
  });

  for (const blur of [0, 6]) {
    for (const interleaved of [false, true]) {
      for (const { zoom, retina } of [{ zoom: 1, retina: 1 }, { zoom: 1.5, retina: 1 }, { zoom: 1, retina: 2 }]) {
        it(`reuses selected artwork with blur ${blur}, interleaved ${interleaved}, zoom ${zoom}, retina ${retina}`, () => {
          spyOn(canvas, 'getRetinaScaling').and.returnValue(retina);
          canvas.setDimensions({ width: 180, height: 160 });
          const selected = [0, 1, 2].map(index => {
            const shape = new EffectRect({ left: -10 + index * 25, top: 20 + index * 15,
              width: 50, height: 40, angle: 12, opacity: 0.7,
              fill: ['#ff0000', '#00ff00', '#0000ff'][index] });
            shape.designBlur = blur;
            return shape;
          });
          const stationary = new Circle({ left: 35, top: 35, radius: 25, opacity: 0.5, fill: '#111111' });
          canvas.add(selected[0]);
          if (interleaved) canvas.add(stationary);
          canvas.add(selected[1], selected[2]);
          if (!interleaved) canvas.add(stationary);
          const selection = new ActiveSelection(selected, { canvas });
          canvas.setActiveObject(selection);
          canvas.setZoom(zoom);
          const renders = [...selected, stationary].map(object => spyOn(object, 'render').and.callThrough());
          const order = [...canvas.getObjects()];
          canvas.beginGesture(selection);
          for (let frame = 0; frame < 10; frame++) {
            selection.set({ left: selection.left + 2, top: selection.top + 2 });
            selection.setCoords();
            canvas.renderAll();
          }
          renders.forEach(render => expect(render).toHaveBeenCalledTimes(1));
          const preview = pixels(canvas);
          canvas.endGesture();
          canvas.renderAll();
          const normal = pixels(canvas);
          let difference = 0;
          preview.forEach((value, index) => { difference = Math.max(difference, Math.abs(value - normal[index])); });
          // Transparent runs introduce another rounding step when composited.
          expect(difference).toBeLessThanOrEqual(3);
          expect(canvas.getObjects()).toEqual(order);
          expect(selection.getObjects()).toEqual(selected);
          renders.forEach(render => expect(render).toHaveBeenCalledTimes(2));
        });
      }
    }
  }

  it('refreshes selected previews after edits, zooming, and changing the stack', () => {
    const first = new Rect({ left: 20, top: 20, width: 30, height: 30 });
    const last = new Rect({ left: 60, top: 60, width: 30, height: 30 });
    canvas.add(first, last);
    const selection = new ActiveSelection([first, last], { canvas });
    canvas.setActiveObject(selection);
    const render = spyOn(last, 'render').and.callThrough();
    canvas.beginGesture(selection);
    canvas.renderAll();
    last.set('fill', '#ff0000');
    canvas.renderAll();
    expect(render).toHaveBeenCalledTimes(2);
    canvas.setZoom(1.5);
    canvas.renderAll();
    expect(render).toHaveBeenCalledTimes(3);
    canvas.add(new Rect({ left: 50, top: 50, width: 10, height: 10 }));
    canvas.renderAll();
    expect(render).toHaveBeenCalledTimes(4);
    canvas.beginGesture(selection);
    canvas.renderAll();
    expect(render).toHaveBeenCalledTimes(5);
  });

  for (const action of ['scale', 'rotate']) {
    it(`keeps a multi-selection live during ${action}`, () => {
      const first = new Rect({ width: 30, height: 30 });
      const last = new Rect({ left: 60, top: 60, width: 30, height: 30 });
      canvas.add(first, last);
      const selection = new ActiveSelection([first, last], { canvas });
      canvas.setActiveObject(selection);
      const render = spyOn(first, 'render').and.callThrough();
      canvas.beginGesture(selection, action);
      canvas.renderAll();
      canvas.renderAll();
      expect(render).toHaveBeenCalledTimes(2);
    });
  }

  it('preserves live rendering when selected objects use destination-dependent blending', () => {
    const first = new Rect({ width: 80, height: 80, fill: '#ff0000' });
    const last = new Rect({ left: 20, top: 20, width: 30, height: 30, globalCompositeOperation: 'destination-out' });
    canvas.add(first, last);
    const selection = new ActiveSelection([first, last], { canvas });
    canvas.setActiveObject(selection);
    canvas.renderAll();
    const normal = pixels(canvas);
    const render = spyOn(first, 'render').and.callThrough();
    canvas.beginGesture(selection);
    canvas.renderAll();
    canvas.renderAll();
    expect(pixels(canvas)).toEqual(normal);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('preserves destination-dependent blending', () => {
    const first = new Rect({ width: 80, height: 80, fill: '#ff0000' });
    const moving = new Rect({ left: 20, top: 20, width: 20, height: 20, globalCompositeOperation: 'destination-out' });
    canvas.add(first, moving);
    canvas.renderAll();
    const normal = pixels(canvas);
    canvas.beginGesture(moving);
    canvas.renderAll();
    expect(pixels(canvas)).toEqual(normal);
  });
});
