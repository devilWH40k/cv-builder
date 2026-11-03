import { Component, DestroyRef, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DeleteConfirmationService } from './delete-confirmation.service';

@Component({ template: '<button type="button" (click)="request()">Delete item</button>' })
class ConfirmationHost {
  readonly owner = inject(DestroyRef);
  readonly confirmation = inject(DeleteConfirmationService);
  result: Promise<boolean> | null = null;
  request(): void {
    this.result = this.confirmation.confirm({ title: 'Delete experience', itemName: 'Project <Demo>' }, this.owner);
  }
}

describe('Delete confirmation', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  async function setup() {
    const fixture = TestBed.createComponent(ConfirmationHost);
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    trigger.focus(); trigger.click();
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('#delete-confirmation')!;
    return { fixture, trigger, dialog };
  }

  it('uses the shared dialog, names the item safely, and confirms only through Delete', async () => {
    const { fixture, trigger, dialog } = await setup();
    expect(dialog.open).toBeTrue();
    expect(dialog.querySelector('h2')!.textContent).toBe('Delete experience');
    expect(dialog.querySelector('strong')!.textContent).toBe('Project <Demo>');
    expect(dialog.querySelector('demo')).toBeNull();
    const confirm = dialog.querySelector<HTMLButtonElement>('.confirm-delete button')!;
    expect(confirm.classList.contains('danger')).toBeTrue();
    expect(document.activeElement).not.toBe(confirm);
    confirm.click();
    expect(await fixture.componentInstance.result).toBeTrue();
    expect(document.querySelector('#delete-confirmation')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  for (const dismissal of ['Cancel', 'Escape', 'backdrop', 'close']) {
    it(`cancels with ${dismissal} and restores focus without confirming`, async () => {
      const { fixture, trigger, dialog } = await setup();
      if (dismissal === 'Cancel') dialog.querySelector<HTMLButtonElement>('.cancel button')!.click();
      else if (dismissal === 'Escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      else if (dismissal === 'backdrop') dialog.parentElement!.click();
      else dialog.querySelector<HTMLButtonElement>('.close')!.click();
      expect(await fixture.componentInstance.result).toBeFalse();
      expect(document.querySelector('.dialog-overlay')).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(fixture.nativeElement.inert).toBeFalse();
    });
  }

  it('ignores duplicate requests and permits a fresh confirmation after dismissal', async () => {
    const { fixture, trigger, dialog } = await setup();
    expect(await fixture.componentInstance.confirmation.confirm({ title: 'Delete CV', itemName: 'Other' }, fixture.componentInstance.owner)).toBeFalse();
    expect(document.querySelectorAll('#delete-confirmation').length).toBe(1);
    dialog.querySelector<HTMLButtonElement>('.cancel button')!.click();
    expect(await fixture.componentInstance.result).toBeFalse();
    trigger.click();
    await fixture.whenStable();
    expect(document.querySelector<HTMLDialogElement>('#delete-confirmation')!.open).toBeTrue();
  });

  it('cancels and cleans up if the requesting component is destroyed', async () => {
    const { fixture } = await setup();
    const result = fixture.componentInstance.result;
    fixture.destroy();
    expect(await result).toBeFalse();
    expect(document.querySelector('#delete-confirmation')).toBeNull();
    expect(document.querySelector('app-delete-confirmation')).toBeNull();
    expect(document.querySelector('.dialog-overlay')).toBeNull();
  });
});
