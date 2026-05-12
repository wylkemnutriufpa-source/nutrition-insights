/**
 * MealPlanSnapshot v1 — Contrato Imutável (Onda 1)
 * ─────────────────────────────────────────────────
 * Fonte única de verdade gerada no momento de "Salvar e Publicar".
 * Nenhuma camada deve LER este snapshot na Onda 1.
 * Apenas geração + persistência.
 */

export const SNAPSHOT_SCHEMA_VERSION = "1.0.0" as const;

export interface SnapshotMacros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface SnapshotTargets extends SnapshotMacros {
  /** Ex: "lose_weight" | "maintain" | "gain_muscle" — string livre, normalização ocorre no consumer */
  goal?: string | null;
}

export interface SnapshotPatientContext {
  id: string;
  weight_kg: number | null;
  /** Origem do peso usado no cálculo dos targets (profile, weight_history, assessment, anamnesis, fallback...) */
  weight_source: string | null;
  height_cm: number | null;
  age: number | null;
  gender: string | null;
  activity_level: string | null;
  goal: string | null;
}

export interface SnapshotSubstitution {
  /** Identificador opcional do alimento equivalente (se conhecido) */
  food_id?: string | null;
  name: string;
  grams: number | null;
  unit_label?: string | null;
  macros?: SnapshotMacros | null;
  /** % de equivalência calórica relativa ao item base (0–100) */
  equivalence_pct?: number | null;
  image_url?: string | null;
}

export interface SnapshotItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  visual_library_item_id: string | null;
  is_primary: boolean;
  is_locked: boolean;
  substitution_group_id: string | null;
  target_percentage: number | null;
  /** Macros DEFINITIVOS gravados no momento da publicação (não recalcular) */
  macros: SnapshotMacros;
  substitutions: SnapshotSubstitution[];
}

export interface SnapshotMeal {
  meal_type: string;
  /** Total agregado da refeição no momento da publicação */
  totals: SnapshotMacros;
  items: SnapshotItem[];
}

export interface SnapshotDay {
  /** 0 = Domingo … 6 = Sábado (compat. day_of_week atual) */
  day_of_week: number;
  totals: SnapshotMacros;
  meals: SnapshotMeal[];
}

export interface SnapshotPlanMetadata {
  plan_id: string;
  patient_id: string;
  nutritionist_id: string;
  tenant_id: string | null;
  title: string;
  start_date: string | null;
  end_date: string | null;
  plan_type: string | null;
  plan_mode: string | null;
  template_id: string | null;
  template_slug: string | null;
  template_version: number | null;
  generation_source: string | null;
  protocol_used: string | null;
}

export interface MealPlanSnapshotV1 {
  /** Versão do contrato. NUNCA mudar sem migração. */
  schema_version: typeof SNAPSHOT_SCHEMA_VERSION;
  /** Versão do motor que produziu o plano (ex: "clinical-macro-engine@1.0.0") */
  engine_version: string;
  /** ISO-8601 da geração do snapshot */
  generated_at: string;
  /** Hash SHA-256 hex do payload canônico (sem o campo `hash` em si) */
  hash: string;

  plan: SnapshotPlanMetadata;
  patient_context: SnapshotPatientContext;
  targets: SnapshotTargets;

  /** Estrutura completa do plano (dias → refeições → itens) */
  days: SnapshotDay[];

  /** Totais agregados ao nível semanal */
  weekly_totals: SnapshotMacros;
  /** Média diária (weekly / nº de dias com itens) */
  daily_average: SnapshotMacros;
}
