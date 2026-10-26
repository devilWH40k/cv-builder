import { FabricImage, filters } from 'fabric';
import { ImageEffects } from '../interfaces/constructor-document';

export function imageEffects(image: FabricImage | null): ImageEffects {
  const active = image?.filters ?? [];
  return {
    brightness: (active.find((filter) => filter instanceof filters.Brightness)?.brightness ?? 0) * 100,
    contrast: (active.find((filter) => filter instanceof filters.Contrast)?.contrast ?? 0) * 100,
    saturation: (active.find((filter) => filter instanceof filters.Saturation)?.saturation ?? 0) * 100,
    blur: (active.find((filter) => filter instanceof filters.Blur)?.blur ?? 0) * 100,
    grayscale: active.some((filter) => filter instanceof filters.Grayscale),
    sepia: active.some((filter) => filter.type === 'Sepia'),
    invert: active.some((filter) => filter instanceof filters.Invert),
  };
}

export function applyImageEffects(image: FabricImage, update: Partial<ImageEffects>): void {
  const values = { ...imageEffects(image), ...update };
  const normalized = (value: number, min = -100, max = 100) =>
    Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0)) / 100;
  image.filters = [
    new filters.Brightness({ brightness: normalized(values.brightness) }),
    new filters.Contrast({ contrast: normalized(values.contrast, -100, 99) }),
    new filters.Saturation({ saturation: normalized(values.saturation) }),
    ...(values.grayscale ? [new filters.Grayscale()] : []),
    ...(values.sepia ? [new filters.Sepia()] : []),
    ...(values.invert ? [new filters.Invert()] : []),
    new filters.Blur({ blur: normalized(values.blur, 0) }),
  ];
  image.applyFilters();
  image.set('dirty', true);
}
