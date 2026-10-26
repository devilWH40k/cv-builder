import { ActiveSelection, Point, Textbox, util } from 'fabric';

/** Reflows selected text frames while the selection scales its other objects normally. */
export function selectionTextResize(selection: ActiveSelection): () => void {
  const scaleX = selection.scaleX;
  const scaleY = selection.scaleY;
  const frames = selection.getObjects().flatMap((object) => object instanceof Textbox ? [{
    text: object,
    width: object.width,
    height: object.height,
    center: object.getRelativeCenterPoint(),
    matrix: object.calcTransformMatrix(),
  }] : []);

  return () => {
    if (!selection.scaleX || !selection.scaleY) return;
    const groupMatrix = selection.calcTransformMatrix();
    const inverse = util.invertTransform(groupMatrix);
    for (const { text, width, height, center, matrix } of frames) {
      text.set('width', width * Math.abs(selection.scaleX / scaleX));
      text.initDimensions();
      text.designTextHeight = Math.max(text.calcTextHeight(), height * Math.abs(selection.scaleY / scaleY));
      text.set('height', text.designTextHeight);
      const position = new Point(center).transform(groupMatrix);
      // Retain the original glyph transform in page coordinates; scale only its frame.
      util.applyTransformToObject(text, util.multiplyTransformMatrices(inverse,
        [matrix[0], matrix[1], matrix[2], matrix[3], position.x, position.y]));
      text.setCoords();
    }
  };
}
