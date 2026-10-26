import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConstructorLayers } from './constructor-layers';
import { ConstructorEditor } from '../../services/constructor-editor';
import { loadDesignFonts } from '../../helpers/design-assets';
import { blankDesign } from '../../helpers/preview-to-design';

describe('Constructor layer names', () => {
  let fixture: ComponentFixture<ConstructorLayers>;
  let editor: ConstructorEditor;
  let canvas: HTMLCanvasElement;
  let host: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ConstructorEditor],
    });
    await loadDesignFonts();
    editor = TestBed.inject(ConstructorEditor);
    canvas = document.createElement('canvas');
    document.body.append(canvas);
    editor.attach(canvas, () => {});
    await editor.load(blankDesign().pages[0]);
    fixture = TestBed.createComponent(ConstructorLayers);
    host = fixture.nativeElement;
  });

  afterEach(async () => {
    fixture.destroy();
    await editor.dispose();
    canvas.remove();
  });

  const enterName = (input: HTMLInputElement, name: string): void => {
    input.value = name;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  async function startRename(): Promise<HTMLInputElement> {
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.rename')!.click();
    await fixture.whenStable();
    return host.querySelector<HTMLInputElement>('.layer-name')!;
  }

  it('focuses the current name and saves text layer names with Enter', async () => {
    editor.addText();
    const input = await startRename();
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('Your text');
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
    enterName(input, 'Overview');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(editor.layers()[0].label).toBe('Overview');
    expect(host.querySelector('.layer-name')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('.rename'));
  });

  it('keeps the name for blank input and cancels edits with Escape', async () => {
    editor.addShape('rectangle');
    const before = editor.snapshot();
    const history = editor.undoCount().length;
    let input = await startRename();
    enterName(input, '   ');
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(editor.snapshot()).toBe(before);
    input = await startRename();
    enterName(input, 'Discarded');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(editor.snapshot()).toBe(before);
    expect(editor.undoCount().length).toBe(history);
    expect(host.querySelector('.layer-name')).toBeNull();
  });

  it('renames groups with the save button and nested members on blur', async () => {
    editor.addText();
    editor.addShape('rectangle');
    editor.selectAll();
    editor.group();
    const input = await startRename();
    enterName(input, 'Heading');
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.rename')!.click();
    await fixture.whenStable();
    expect(editor.layers()[0].label).toBe('Heading');
    expect(host.querySelector('.layer')!.textContent).toContain('Heading');
    host.querySelector<HTMLButtonElement>('.expand')!.click();
    fixture.detectChanges();
    host.querySelectorAll<HTMLButtonElement>('.rename')[1].click();
    await fixture.whenStable();
    const memberInput = host.querySelector<HTMLInputElement>('.layer-name')!;
    enterName(memberInput, 'Decoration');
    memberInput.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(editor.layers()[0].children![0].label).toBe('Decoration');
    expect(host.querySelectorAll('.layer').length).toBe(3);
    expect(host.querySelector('.expand')!.getAttribute('aria-expanded')).toBe('true');
  });
});
