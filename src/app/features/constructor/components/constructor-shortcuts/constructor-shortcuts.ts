import { Dialog } from 'angular-shared-ui/dialog';
import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-constructor-shortcuts',
  imports: [Dialog],
  templateUrl: './constructor-shortcuts.html',
  styleUrl: './constructor-shortcuts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructorShortcuts {
  readonly dismissed = output<void>();
  protected readonly categories = [
    { name: 'General', entries: [
      { label: 'Save design', keys: 'Ctrl / Cmd + S' },
      { label: 'Import design file', keys: 'Ctrl / Cmd + I' },
      { label: 'Export PDF', keys: 'Ctrl / Cmd + E' },
      { label: 'Export design file', keys: 'Ctrl / Cmd + Shift + E' },
      { label: 'Undo', keys: 'Ctrl / Cmd + Z' },
      { label: 'Redo', keys: 'Ctrl / Cmd + Shift + Z' },
      { label: 'Select all objects', keys: 'Ctrl / Cmd + A' },
      { label: 'Copy / Cut / Paste', keys: 'Ctrl / Cmd + C / X / V' },
      { label: 'Duplicate selection', keys: 'Ctrl / Cmd + D' },
      { label: 'Delete selection', keys: 'Delete / Backspace' },
      { label: 'Move selection by 1 px', keys: 'Arrow keys' },
      { label: 'Move selection by 10 px', keys: 'Shift + Arrow keys' },
      { label: 'Open context menu', keys: 'Right-click object or layer' },
      { label: 'Close dialog or cancel style copying', keys: 'Escape' },
    ] },
    { name: 'Text', entries: [
      { label: 'Edit text', keys: 'Double-click text' },
      { label: 'Select all text while editing', keys: 'Ctrl / Cmd + A' },
      { label: 'Select text while editing', keys: 'Shift + Arrow keys' },
      { label: 'Finish editing', keys: 'Escape / Tab' },
    ] },
    { name: 'Image', entries: [
      { label: 'Insert an image', keys: 'Insert image tool' },
      { label: 'Replace selected image', keys: 'Properties → Replace image' },
      { label: 'Resize an image', keys: 'Drag selection handles' },
    ] },
    { name: 'Figure', entries: [
      { label: 'Insert a figure', keys: 'Add shape tool' },
      { label: 'Move a figure', keys: 'Drag selected figure' },
      { label: 'Resize a figure', keys: 'Drag selection handles' },
      { label: 'Rotate an object', keys: 'Drag rotation handle' },
    ] },
    { name: 'Layers and groups', entries: [
      { label: 'Group selection', keys: 'Ctrl / Cmd + G' },
      { label: 'Ungroup selection', keys: 'Ctrl / Cmd + Shift + G' },
      { label: 'Expand group in Layers', keys: 'Double-click group row' },
    ] },
    { name: 'Guides', entries: [
      { label: 'Create a guide', keys: 'Drag from a ruler' },
      { label: 'Move focused guide', keys: 'Arrow keys' },
      { label: 'Move focused guide by 10 px', keys: 'Shift + Arrow keys' },
      { label: 'Remove focused guide', keys: 'Delete / Backspace' },
    ] },
  ] as const;
}
