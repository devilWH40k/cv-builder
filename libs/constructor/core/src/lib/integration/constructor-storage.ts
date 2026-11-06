import { InjectionToken, Provider, ProviderToken } from '@angular/core';
import { ConstructorDocument, DesignSummary } from '../interfaces/constructor-document';

/** Persistence contract shared by local and remote constructor storage adapters. */
export interface ConstructorStorage {
  /** Return all summaries ordered by updatedAt, newest first. */
  list(): Promise<readonly DesignSummary[]>;
  /** Return a raw document, or null when it does not exist. The repository validates it. */
  load(id: string): Promise<unknown>;
  /** Upsert a validated document without changing its ID or timestamps. */
  save(design: ConstructorDocument): Promise<void>;
  /** Delete the document and its recent-visit metadata. Missing IDs are a no-op. */
  delete(id: string): Promise<void>;
  /** Return existing, visited designs ordered by visitedAt, newest first, up to limit. */
  recentlyVisited(limit: number): Promise<readonly DesignSummary[]>;
  /** Record a visit for an existing design without changing its updatedAt. */
  recordVisit(id: string): Promise<void>;
}

export const CONSTRUCTOR_STORAGE = new InjectionToken<ConstructorStorage>('Constructor storage');

export function provideConstructorStorage(storage: ProviderToken<ConstructorStorage>): Provider {
  return { provide: CONSTRUCTOR_STORAGE, useExisting: storage };
}
