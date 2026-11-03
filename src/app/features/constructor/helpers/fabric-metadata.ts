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
    designIconName?: string;
    linkUrl?: string;
    designTextLinks?: DesignTextLink[];
    designBlur?: number;
    designTextHeight?: number;
    designPartialLock?: boolean;
    designFullLock?: boolean;
  }
  interface SerializedObjectProps {
    designId?: string;
    designLabel?: string;
    designLayerName?: string;
    designIconName?: string;
    linkUrl?: string;
    designTextLinks?: DesignTextLink[];
    designBlur?: number;
    designTextHeight?: number;
    designPartialLock?: boolean;
    designFullLock?: boolean;
  }
}

FabricObject.customProperties = [
  ...new Set([...FabricObject.customProperties, 'designId', 'designLabel', 'designLayerName', 'designIconName', 'linkUrl', 'designTextLinks', 'designBlur', 'designTextHeight', 'designPartialLock', 'designFullLock']),
];

export function identifyObject(object: FabricObject, label: string): void {
  object.designId ??= crypto.randomUUID();
  object.designLabel ??= label;
}
