
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
  blockId: string; // 🛡️ IDENTIFICADOR ÚNICO DE HIERARQUIA
  quantity_display: string;
  clinical_mass_g?: number;
  macros: SovereignMacros;
  visual: SovereignVisual;
  substitutions: Array<SovereignSubstitution>;
}

export interface SovereignSubstitution {
  id: string;
  title: string;
  blockId?: string; // 🛡️ VINCULADO AO PAI SE SUBSTITUIÇÃO
  quantity_display: string;
  macros: SovereignMacros;
  visual: SovereignVisual;
}

export interface SovereignMeal {
  id: string;
  name: string;
  time?: string;
  order_index: number;
  macros: SovereignMacros;
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
  /** 🛡️ SPRINT C: Data de publicação (pode diferir de generated_at em republicações) */
  published_at?: string;
  /** 🛡️ SPRINT C: Número da revisão (começa em 1, incrementa a cada republicação) */
  revision_number?: number;
  /** 🛡️ SPRINT C: Histórico das últimas 10 revisões (targets + publication_id) */
  version_history?: Array<{
    revision: number;
    published_at?: string;
    targets: SovereignMacros;
    publication_id: string;
  }>;
  /** 🛡️ SPRINT C: Metadados clínicos auditáveis — NUNCA sobrescritos, apenas enriquecidos */
  clinical_metadata?: {
    generated_at?: string;
    engine_version?: string;       // 'mifflin_v1' | 'manual_v3'
    patient_id?: string;
    tmb?: number;
    tdee?: number;
    kcal_target?: number;
    sex?: string;
    age?: number;
    weight_kg?: number;
    height_cm?: number;
    activity_level?: string;
    goal?: string;
    template_id?: string;
    template_title?: string;
    kcal_profile_used?: string;
    has_anamnesis?: boolean;
    dietary_restrictions?: string[];
    health_conditions?: string[];
    published_by?: string;
    republished_at?: string;
    republished_by?: string;
    revision_number?: number;
    [key: string]: any;
  };
  targets: SovereignMacros;
  days: SovereignDay[];
  daily_totals: Record<number, SovereignMacros>;
  notes?: string;
}
