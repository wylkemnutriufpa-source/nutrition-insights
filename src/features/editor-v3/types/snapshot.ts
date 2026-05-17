
export interface SovereignVisual {
  image_url: string;
  is_placeholder: boolean;
  placeholder_id?: string;
  library_item_id?: string;
}

export interface SovereignMacros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface SovereignItem {
  id: string;
  title: string;
  quantity_display: string;
  clinical_mass_g?: number;
  macros: SovereignMacros;
  visual: SovereignVisual;
  substitutions: Array<SovereignSubstitution>;
}

export interface SovereignSubstitution {
  id: string;
  title: string;
  quantity_display: string;
  macros: SovereignMacros;
  visual: SovereignVisual;
}

export interface SovereignMeal {
  id: string;
  name: string;
  time?: string;
  order_index: number;
  items: SovereignItem[];
}

export interface SovereignDay {
  day_of_week: number;
  meals: SovereignMeal[];
}

export interface SovereignSnapshotV3 {
  publication_id: string;
  snapshot_version: 'v3';
  generated_at: string;
  targets: SovereignMacros;
  days: SovereignDay[];
  daily_totals: Record<number, SovereignMacros>;
  notes?: string;
}
