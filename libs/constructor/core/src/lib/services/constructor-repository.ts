import { inject, Injectable } from '@angular/core';
import { CONSTRUCTOR_STORAGE } from '../integration/constructor-storage';
import { ConstructorDocument, DesignSummary } from '../interfaces/constructor-document';
import { parseDesign } from '../utils/documents/design-validation';

/** Validates design documents while persistence is supplied by the host application. */
@Injectable({ providedIn: 'root' })
export class ConstructorRepository {
  private readonly storage = inject(CONSTRUCTOR_STORAGE);

  async list(): Promise<readonly DesignSummary[]> {
    return this.storage.list();
  }

  async load(id: string): Promise<ConstructorDocument | null> {
    const document = await this.storage.load(id);
    return document === null ? null : parseDesign(document);
  }

  async save(design: ConstructorDocument): Promise<void> {
    await this.storage.save(parseDesign(design));
  }

  async delete(id: string): Promise<void> {
    await this.storage.delete(id);
  }

  async recentlyVisited(limit = 6): Promise<readonly DesignSummary[]> {
    return this.storage.recentlyVisited(limit);
  }

  async recordVisit(id: string): Promise<void> {
    await this.storage.recordVisit(id);
  }
}
