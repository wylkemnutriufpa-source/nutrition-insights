/**
 * FitJourney — EDITOR V3 Anti-Cascade Contracts (ARQUITETURA DETERMINÍSTICA)
 * 
 * Este arquivo define a "Constituição" técnica do sistema, proibindo qualquer alteração 
 * que viole a continuidade da jornada do paciente ou a integridade dos dados clínicos.
 * 
 * Regras Globais:
 * 1. Nenhuma ação sem validação.
 * 2. Nenhuma decisão sem log.
 * 3. Nenhuma alteração automática crítica (Sem Auto-Cura).
 * 4. Nenhuma quebra silenciosa (Erro sempre visível).
 */

export const system_anti_cascade_mode = true;

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
  if (!s.draftId) v.push("Contract Violation: Draft ID ausente");
  if (!s.meals || s.meals === null) v.push("Contract Violation: meals nunca pode ser null");
  
  const ids = s.items.map(i => i.instanceId);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    v.push("Contract Violation: items com instanceId duplicado detectado (Violação de Isolamento)");
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
  if (s.kcal <= 0) v.push(`Contract Violation: Kcal inválida (${s.kcal}) detectada pelo Clinical Engine`);
  if (s.protein <= 0) v.push(`Contract Violation: Proteína inválida (${s.protein}) detectada pelo Clinical Engine`);
  if (!s.isValid) v.push("Contract Violation: Plano clínico inválido detectado. Ação bloqueada pela Security Layer.");
  
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
  // Mesma ação -> mesmo resultado
  if (s.mealCount === 0) v.push("Contract Violation: Engine determinismo falhou — 0 refeições geradas (NÃO duplicar/NÃO apagar)");
  if (s.hasManualOverrides && !s.overrideConfirmed) {
    v.push("Contract Violation: Tentativa de sobrescrever manual sem confirmação (NÃO sobrescrever manual)");
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
    v.push("Contract Violation: Nenhum dado pode ser perdido — draft deve ser persistido antes de ações críticas");
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
  if (s.hasInvisibleState) v.push("Contract Violation: Nenhum estado invisível permitido");
  if (s.dbStatus !== s.uiStatus && !s.errorVisible) {
    v.push("Contract Violation: Erro de sincronia detectado e NÃO está visível para o usuário (Erro sempre visível)");
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
