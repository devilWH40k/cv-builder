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

  it('preserves normal rendering for a multi-selection spanning layers', () => {
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
