import { Injectable } from '@angular/core';
import type { LucideIconData } from 'lucide-angular';

export interface LibraryIcon {
  readonly name: string;
  readonly label: string;
  readonly data: LucideIconData;
}

@Injectable({ providedIn: 'root' })
export class ConstructorIcons {
  async load(): Promise<readonly LibraryIcon[]> {
    const { icons } = await import('lucide-angular/src/icons');
    return Object.entries(icons).map(([name, data]) => ({
      name,
      label: name.replace(/([a-z0-9])([A-Z])/g, '$1 $2'),
      data,
    })).sort((a, b) => a.label.localeCompare(b.label));
  }
}

export function iconSvg(data: LucideIconData): string {
  const root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: '24', height: '24', fill: 'none', stroke: '#111827', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) {
    root.setAttribute(key, value);
  }
  for (const [tag, attributes] of data) {
    const child = document.createElementNS(root.namespaceURI, tag);
    for (const [key, value] of Object.entries(attributes)) child.setAttribute(key, String(value));
    root.append(child);
  }
  return new XMLSerializer().serializeToString(root);
}
