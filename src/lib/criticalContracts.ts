/**
 * FitJourney — EDITOR V3 Anti-Cascade Contracts
 * 
 * Define regras de integridade determinísticas que bloqueiam o sistema em caso de inconsistência.
 * Seguindo os princípios de Determinismo, Isolamento e Sem Auto-Cura.
 */

export type ContractResult = {
  ok: boolean;
  contractId: string;
  violations: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. DRAFT INTEGRITY (Obrigatório)
// ─────────────────────────────────────────────────────────────────────────────

export interface DraftSnapshot {
  draftId: string;
  meals: any[]; // meals nunca pode ser null
  items: { instanceId: string; [key: string]: any }[]; // items sempre com instanceId único
  locked: boolean; // locked nunca pode ser removido automaticamente
}

export function draftIntegrityContract(s: DraftSnapshot): ContractResult {
  const v: string[] = [];
  if (!s.draftId) v.push("Draft ID ausente");
  if (!s.meals) v.push("Contract Violation: meals nunca pode ser null");
  
  const ids = s.items.map(i => i.instanceId);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    v.push("Contract Violation: items com instanceId duplicado detectado");
  }

  return { ok: v.length === 0, contractId: "draft_integrity", violations: v };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CLINICAL VALIDITY
// ─────────────────────────────────────────────────────────────────────────────

export interface ClinicalSnapshot {
  kcal: number;
  protein: number;
  patientRestrictions: string[];
  isValid: boolean; // plano inválido NÃO pode salvar
}

export function clinicalValidityContract(s: ClinicalSnapshot): ContractResult {
  const v: string[] = [];
  if (s.kcal <= 0) v.push(`Kcal inválida: ${s.kcal}`);
  if (s.protein <= 0) v.push(`Proteína inválida: ${s.protein}`);
  if (!s.isValid) v.push("Contract Violation: Plano clínico inválido detectado. Ação bloqueada.");
  
  return { ok: v.length === 0, contractId: "clinical_validity", violations: v };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ENGINE DETERMINISM
// ─────────────────────────────────────────────────────────────────────────────

export interface EngineSnapshot {
  action: string;
  previousResultHash?: string;
  currentResultHash?: string;
  mealCount: number;
  hasManualOverrides: boolean;
  overrideConfirmed: boolean;
}

export function engineDeterminismContract(s: EngineSnapshot): ContractResult {
  const v: string[] = [];
  // Mesma ação -> mesmo resultado (implícito via hash se necessário no futuro)
  if (s.mealCount === 0) v.push("Contract Violation: Engine gerou 0 refeições (Não duplicar/Não apagar)");
  if (s.hasManualOverrides && !s.overrideConfirmed) {
    v.push("Contract Violation: Tentativa de sobrescrever manual sem confirmação");
  }
  return { ok: v.length === 0, contractId: "engine_determinism", violations: v };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PERSISTENCE SAFETY
// ─────────────────────────────────────────────────────────────────────────────

export interface PersistenceSnapshot<T> {
  local: T;
  remote: T;
  isSaving: boolean;
  draftPersistedBeforeAction: boolean;
}

export function persistenceSafetyContract<T>(s: PersistenceSnapshot<T>): ContractResult {
  const v: string[] = [];
  if (!s.draftPersistedBeforeAction && s.isSaving) {
    v.push("Contract Violation: Draft deve ser persistido antes de ações críticas");
  }
  return { ok: v.length === 0, contractId: "persistence_safety", violations: v };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. UI CONSISTENCY
// ─────────────────────────────────────────────────────────────────────────────

export interface UIStatusSnapshot {
  dbStatus: string | null;
  uiStatus: string | null;
  errorVisible: boolean;
  hasInvisibleState: boolean;
}

export function uiConsistencyContract(s: UIStatusSnapshot): ContractResult {
  const v: string[] = [];
  if (s.hasInvisibleState) v.push("Contract Violation: Estado invisível detectado");
  if (s.dbStatus !== s.uiStatus && !s.errorVisible) {
    v.push("Contract Violation: Erro de sincronia detectado e NÃO está visível para o usuário");
  }
  return { ok: v.length === 0, contractId: "ui_consistency", violations: v };
}

export const CRITICAL_CONTRACTS = {
  draft_integrity: draftIntegrityContract,
  clinical_validity: clinicalValidityContract,
  engine_determinism: engineDeterminismContract,
  persistence_safety: persistenceSafetyContract,
  ui_consistency: uiConsistencyContract,
} as const;

export type CriticalContractId = keyof typeof CRITICAL_CONTRACTS;
