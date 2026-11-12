export type FieldVariant =
  | 'culture' | 'overview' | 'membrane' | 'breach' | 'lattice' | 'survey' | 'specimen' | 'repair' | 'ascent';
export interface FieldLight { top: number; rest: number; }
export const FIELD_VARIANTS: Readonly<Record<FieldVariant, Readonly<{ light: FieldLight } & Record<string, unknown>>>>;
