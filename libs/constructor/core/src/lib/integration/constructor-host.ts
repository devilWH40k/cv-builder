import { InjectionToken } from '@angular/core';

export interface ConstructorSourceDocument {
  readonly title: string;
  readonly sourceCvId: string | null;
  readonly render: () => void;
}

/** Loads a source; rendering is deferred until the editor accepts the current request. */
export interface ConstructorSource {
  load(id: string | null): Promise<ConstructorSourceDocument | null>;
  reset(): void;
}

export const CONSTRUCTOR_SOURCE = new InjectionToken<ConstructorSource | null>('Constructor source', {
  providedIn: 'root', factory: () => null,
});
export const CONSTRUCTOR_VERSION = new InjectionToken<string>('Constructor host version', {
  providedIn: 'root', factory: () => '',
});

