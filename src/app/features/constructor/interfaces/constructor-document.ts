/** Page coordinates are CSS pixels at 96 DPI, independent of editor zoom. */
export const A4_WIDTH = (210 * 96) / 25.4;
export const A4_HEIGHT = (297 * 96) / 25.4;

export interface ConstructorPage {
  readonly id: string;
  /** Fabric JSON is kept at the adapter boundary, rather than leaking into UI state. */
  readonly scene: string;
}

export interface ConstructorDocument {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly sourceCvId: string | null;
  readonly updatedAt: number;
  readonly pages: readonly ConstructorPage[];
}

export interface DesignSummary {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: number;
  readonly visitedAt?: number;
}

export type ConstructorTool = 'select' | 'draw' | 'style';
export type ObjectAlignment = 'left' | 'center' | 'right';
export type LayerKind = 'text' | 'image' | 'rectangle' | 'circle' | 'line' | 'drawing' | 'group' | 'shape';

export interface ImageEffects {
  readonly brightness: number;
  readonly contrast: number;
  readonly saturation: number;
  readonly blur: number;
  readonly grayscale: boolean;
  readonly sepia: boolean;
  readonly invert: boolean;
}

export interface SelectionProperties {
  readonly id: string;
  readonly label: string;
  readonly kind: LayerKind;
  readonly isRectangle: boolean;
  readonly canBlur: boolean;
  readonly blur: number;
  readonly imageEffects: ImageEffects;
  readonly borderRadius: number;
  readonly borderColor: string;
  readonly borderWidth: number;
  readonly isText: boolean;
  readonly isImage: boolean;
  readonly locked: boolean;
  readonly fontSize: number;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly textAlign: string;
  readonly color: string;
  readonly gradientEnd: string | null;
  readonly linkUrl: string;
}
