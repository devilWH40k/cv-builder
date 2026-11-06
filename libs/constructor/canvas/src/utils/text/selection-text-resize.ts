import { Group, Textbox, util } from 'fabric';

/** Reflows selected text frames while the selection scales its other objects normally. */
export function selectionTextResize(selection: Group): () => void {
  const scaleX = selection.scaleX;
  const scaleY = selection.scaleY;
  const initialInverse = util.invertTransform(selection.calcTransformMatrix());
  const textFrames = (group: Group): Textbox[] => group.getObjects().flatMap((object) =>
    object instanceof Textbox ? [object] : object instanceof Group ? textFrames(object) : []);
  const frames = textFrames(selection).map((object) => ({
    text: object,
    width: object.width,
    height: object.height,
    center: object.getCenterPoint().transform(initialInverse),
    matrix: object.calcTransformMatrix(),
  }));

  return () => {
    if (!selection.scaleX || !selection.scaleY) return;
    const groupMatrix = selection.calcTransformMatrix();
    for (const { text, width, height, center, matrix } of frames) {
      text.set('width', width * Math.abs(selection.scaleX / scaleX));
      text.initDimensions();
      text.designTextHeight = Math.max(text.calcTextHeight(), height * Math.abs(selection.scaleY / scaleY));
      text.set('height', text.designTextHeight);
      const position = center.transform(groupMatrix);
      const inverse = util.invertTransform((text.group ?? selection).calcTransformMatrix());
      // Retain the original glyph transform in page coordinates; scale only its frame.
      util.applyTransformToObject(text, util.multiplyTransformMatrices(inverse,
        [matrix[0], matrix[1], matrix[2], matrix[3], position.x, position.y]));
      text.setCoords();
    }
  };
}
