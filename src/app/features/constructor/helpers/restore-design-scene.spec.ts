import { Canvas, FabricImage, Rect, Textbox } from 'fabric';
import { restoreDesignScene } from './restore-design-scene';
import './fabric-metadata';

describe('Incremental design history', () => {
  it('keeps untouched objects and images while restoring changes, deletions and order', async () => {
    const canvas = new Canvas(undefined);
    const raster = document.createElement('canvas'); raster.width = raster.height = 10;
    const image = new FabricImage(raster); image.designId = 'image';
    const text = new Textbox('Original text', { fontFamily: 'Roboto' }); text.designId = 'text';
    const shape = new Rect({ width: 100, height: 50 }); shape.designId = 'shape';
    canvas.add(image, text, shape);
    const original = JSON.stringify(canvas.toObject());
    text.set('text', 'Changed text');
    canvas.remove(shape);
    const current = JSON.stringify(canvas.toObject());
    const reload = spyOn(canvas, 'loadFromJSON').and.callThrough();
    try {
      await restoreDesignScene(canvas, current, original);
      expect(reload).not.toHaveBeenCalled();
      expect(canvas.getObjects()[0]).toBe(image);
      expect(canvas.getObjects().map((object) => object.designId)).toEqual(['image', 'text', 'shape']);
      const restoredText = canvas.getObjects()[1];
      expect(restoredText instanceof Textbox && restoredText.text === 'Original text').toBeTrue();
      await restoreDesignScene(canvas, original, current);
      expect(canvas.getObjects()[0]).toBe(image);
      expect(canvas.getObjects().length).toBe(2);
      expect(reload).not.toHaveBeenCalled();
    } finally { await canvas.dispose(); }
  });
});
