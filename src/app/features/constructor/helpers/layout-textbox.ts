import { classRegistry, Control, controlsUtils, Textbox, TransformActionHandler } from 'fabric';
import './fabric-metadata';

const resizeTextBox = (horizontal: boolean, vertical: boolean): TransformActionHandler =>
  controlsUtils.wrapWithFireEvent('resizing', controlsUtils.wrapWithFixedAnchor((event, transform, x, y) => {
    const target = transform.target;
    if (!(target instanceof Textbox)) return false;
    let changed = false;
    if (horizontal) changed = controlsUtils.changeObjectWidth(event, transform, x, y);
    if (vertical) {
      changed = controlsUtils.changeObjectHeight(event, transform, x, y) || changed;
      target.designTextHeight = Math.max(target.calcTextHeight(), target.height);
      target.set('height', target.designTextHeight);
    }
    return changed;
  }));

/** Resize text frames through reflow, retaining the font size and a minimum content height. */
export class LayoutTextbox extends Textbox {
  static override createControls(): { controls: Record<string, Control> } {
    const { controls } = super.createControls();
    for (const name of ['mt', 'mb', 'tl', 'tr', 'bl', 'br']) {
      const existing = controls[name];
      controls[name] = new Control({
        x: existing.x, y: existing.y,
        actionName: 'resizing',
        cursorStyleHandler: existing.cursorStyleHandler,
        actionHandler: resizeTextBox(name !== 'mt' && name !== 'mb', true),
      });
    }
    return { controls };
  }

  override initDimensions(): void {
    super.initDimensions();
    this.height = Math.max(this.height, this.designTextHeight ?? 0);
  }
}

classRegistry.setClass(LayoutTextbox, 'Textbox');
