import { ConstructorDocument } from '../../interfaces/constructor-document';

export function blankDesign(): ConstructorDocument {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title: 'Untitled design',
    sourceCvId: null,
    updatedAt: Date.now(),
    pages: [
      { id: crypto.randomUUID(), scene: JSON.stringify({ objects: [], background: '#ffffff' }) },
    ],
  };
}
