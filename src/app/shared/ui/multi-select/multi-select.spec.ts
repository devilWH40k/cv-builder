import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { MultiSelect } from './multi-select';
import { CustomEntryIcons } from '../../../core/dialogs/custom-entry-dialog/custom-entry-icon';

@Component({
  imports: [MultiSelect],
  template: `<app-multi-select inputId="tools" label="Tools" [control]="control"
    [groups]="groups" [allowCustom]="true" [customIcons]="icons()" (customIconsChange)="icons.set($event)" />`
})
class Host {
  readonly control = new FormControl<readonly string[]>([], { nonNullable: true });
  readonly icons = signal<CustomEntryIcons>({});
  readonly groups = [{ label: 'Default', options: ['Angular'] }];
}

describe('Custom multi-select entries', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [Host], providers: [provideZonelessChangeDetection()]
  }));

  async function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    page.querySelector('summary')!.click();
    const trigger = page.querySelector<HTMLButtonElement>('.add-custom')!;
    trigger.focus();
    trigger.click();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('dialog')!;
    const name = dialog.querySelector<HTMLInputElement>('input[type="text"]')!;
    const apply = dialog.querySelector<HTMLButtonElement>('app-button button')!;
    return { fixture, page, dialog, name, apply, trigger };
  }

  it('validates names and cancels without changing selected entries', async () => {
    const { fixture, dialog, name, apply, trigger } = await setup();
    expect(apply.disabled).toBeTrue();
    name.value = '   ';
    name.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(apply.disabled).toBeTrue();
    dialog.querySelector<HTMLButtonElement>('.cancel')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.control.value).toEqual([]);
    expect(fixture.componentInstance.icons()).toEqual({});
    expect(document.querySelector('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('normalizes a wide uploaded icon, applies it, and renders it at the standard size', async () => {
    const { fixture, page, dialog, name, apply } = await setup();
    name.value = '  My SDK  ';
    name.dispatchEvent(new Event('input'));
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 80;
    canvas.getContext('2d')!.fillRect(0, 0, 320, 80);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!)));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], 'wide.png', { type: 'image/png' }));
    const upload = dialog.querySelector<HTMLInputElement>('input[type="file"]')!;
    upload.files = transfer.files;
    upload.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(apply.disabled).toBeFalse();
    const preview = dialog.querySelector<HTMLImageElement>('app-file-upload .icon-preview img')!;
    expect(preview.alt).toBe('Selected icon preview');
    expect(getComputedStyle(preview).objectFit).toBe('contain');
    expect(dialog.querySelector('app-file-upload .filename')?.textContent).toBe('wide.png');
    expect(document.querySelector('app-photo-preview')).toBeNull();
    apply.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.control.value).toEqual(['My SDK']);
    const icon = fixture.componentInstance.icons()['My SDK'];
    const image = new Image();
    image.src = icon;
    await image.decode();
    expect([image.naturalWidth, image.naturalHeight]).toEqual([96, 96]);
    const pixels = document.createElement('canvas');
    pixels.width = pixels.height = 96;
    const context = pixels.getContext('2d')!;
    context.drawImage(image, 0, 0);
    expect(context.getImageData(48, 0, 1, 1).data[3]).toBe(0);
    expect(context.getImageData(48, 48, 1, 1).data[3]).toBe(255);
    const displayed = page.querySelector<HTMLImageElement>('.option-icon')!;
    expect([displayed.width, displayed.height]).toEqual([20, 20]);
    expect(displayed.src).toBe(icon);
  });

  it('reports invalid icons and allows applying without an icon after removal', async () => {
    const { fixture, dialog, name, apply } = await setup();
    name.value = 'SDK';
    name.dispatchEvent(new Event('input'));
    const transfer = new DataTransfer();
    transfer.items.add(new File(['invalid'], 'icon.png', { type: 'image/png' }));
    const upload = dialog.querySelector<HTMLInputElement>('input[type="file"]')!;
    upload.files = transfer.files;
    upload.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('could not be read');
    expect(apply.disabled).toBeTrue();
    dialog.querySelector<HTMLButtonElement>('.icon-actions button')!.click();
    await fixture.whenStable();
    expect(dialog.querySelector('app-file-upload .filename')?.textContent).toBe('');
    expect(dialog.querySelector('app-file-upload img')).toBeNull();
    apply.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.control.value).toEqual(['SDK']);
    expect(fixture.componentInstance.icons()).toEqual({});
  });
});
