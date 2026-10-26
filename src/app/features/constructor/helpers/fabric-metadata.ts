import { FabricObject } from 'fabric';

export interface DesignTextLink {
  readonly text: string;
  readonly linkUrl: string;
}

declare module 'fabric' {
  interface FabricObject {
    designId?: string;
    designLabel?: string;
    designLayerName?: string;
    linkUrl?: string;
    designTextLinks?: DesignTextLink[];
    designBlur?: number;
    designTextHeight?: number;
  }
  interface SerializedObjectProps {
    designId?: string;
    designLabel?: string;
    designLayerName?: string;
    linkUrl?: string;
    designTextLinks?: DesignTextLink[];
    designBlur?: number;
    designTextHeight?: number;
  }
}

FabricObject.customProperties = [
  ...new Set([...FabricObject.customProperties, 'designId', 'designLabel', 'designLayerName', 'linkUrl', 'designTextLinks', 'designBlur', 'designTextHeight']),
];

export function identifyObject(object: FabricObject, label: string): void {
  object.designId ??= crypto.randomUUID();
  object.designLabel ??= label;
}
