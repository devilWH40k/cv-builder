import { DOCUMENT } from '@angular/common';
import { ApplicationRef, createComponent, DestroyRef, EnvironmentInjector, inject, Injectable } from '@angular/core';
import { DeleteConfirmation } from './delete-confirmation';

export interface DeleteConfirmationRequest {
  readonly title: string;
  readonly itemName: string;
  readonly message?: string;
}

@Injectable({ providedIn: 'root' })
export class DeleteConfirmationService {
  private readonly application = inject(ApplicationRef);
  private readonly environment = inject(EnvironmentInjector);
  private readonly document = inject(DOCUMENT);
  private active: ((confirmed: boolean) => void) | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.active?.(false));
  }

  confirm(request: DeleteConfirmationRequest, owner: DestroyRef): Promise<boolean> {
    if (this.active || owner.destroyed) return Promise.resolve(false);
    const host = this.document.createElement('app-delete-confirmation');
    const component = createComponent(DeleteConfirmation, { environmentInjector: this.environment, hostElement: host });
    component.setInput('title', request.title);
    component.setInput('itemName', request.itemName);
    component.setInput('message', request.message ?? 'This action cannot be undone.');
    return new Promise<boolean>((resolve) => {
      let completed = false;
      let unregisterOwner = () => {};
      const finish = (confirmed: boolean) => {
        if (completed) return;
        completed = true;
        unregisterOwner();
        this.application.detachView(component.hostView);
        component.destroy();
        host.remove();
        this.active = null;
        resolve(confirmed);
      };
      this.active = finish;
      unregisterOwner = owner.onDestroy(() => finish(false));
      component.instance.confirmed.subscribe(() => finish(true));
      component.instance.cancelled.subscribe(() => finish(false));
      this.document.body.append(host);
      this.application.attachView(component.hostView);
      component.changeDetectorRef.detectChanges();
    });
  }
}
