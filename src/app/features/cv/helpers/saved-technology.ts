export interface SavedTechnology {
  readonly id: string;
  readonly name: string;
  readonly icon?: string;
  readonly updatedAt: number;
}

export function technologyId(name: string): string {
  return name.trim().toLowerCase();
}
