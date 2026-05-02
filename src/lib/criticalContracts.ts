/**
 * FitJourney — EDITOR V3 Anti-Cascade Contracts
 * 
 * Define regras de integridade que bloqueiam o sistema em caso de inconsistência.
 * Seguindo os princípios de Determinismo e Isolamento.
 */

export type ContractResult = {
  ok: boolean;
  contractId: string;
  violations: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. DRAFT INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

export interface DraftSnapshot {
  draftId: string;
  items: any[];
  lastSavedAt: number;
  checksum?: string;
}

export function draftIntegrityContract(s: DraftSnapshot): ContractResult {
  const v: string[] = [];
  if (!s.draftId) v.push("Draft ID ausente");
  if (!s.items || s.items.length === 0) v.push("Draft sem itens");
  
  return { ok: v.length === 0, contractId: "draft_integrity", violations: v };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CLINICAL VALIDITY
// ─────────────────────────────────────────────────────────────────────────────

export interface ClinicalSnapshot {
  kcal: number;
  protein: number;
  patientRestrictions: string[];
  items: any[];
}

export function clinicalValidityContract(s: ClinicalSnapshot): ContractResult {
  const v: string[] = [];
  if (s.kcal <= 0) v.push(`Kcal inválida: ${s.kcal}`);
  if (s.protein <= 0) v.push(`Proteína inválida: ${s.protein}`);
  
  return { ok: v.length === 0, contractId: "clinical_validity", violations: v };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PERSISTENCE SAFETY
// ─────────────────────────────────────────────────────────────────────────────

export interface PersistenceSnapshot<T> {
  local: T;
  remote: T;
  fields: (keyof T)[];
}

export function persistenceSafetyContract<T>(s: PersistenceSnapshot<T>): ContractResult {
  const v: string[] = [];
  for (const field of s.fields) {
    if (JSON.stringify(s.local[field]) !== JSON.stringify(s.remote[field])) {
      v.push(`Divergência de persistência no campo "${String(field)}"`);
    }
  }
  return { ok: v.length === 0, contractId: "persistence_safety", violations: v };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. UI CONSISTENCY (Journey Continuity Strict)
// ─────────────────────────────────────────────────────────────────────────────

export interface UIStatusSnapshot {
  dbStatus: string | null;
  uiStatus: string | null;
  anamnesisCompleted: boolean;
}

export function uiConsistencyContract(s: UIStatusSnapshot): ContractResult {
  const v: string[] = [];
  
  // Se terminou anamnese mas o status no DB ainda é de onboarding bloqueado,
  // isso é uma inconsistência de sincronia que deve ser reportada (não auto-curada)
  if (s.anamnesisCompleted && s.dbStatus === 'onboarding_active') {
    v.push("Inconsistência: Anamnese completa mas Journey Status ainda em onboarding");
  }

  if (s.dbStatus !== s.uiStatus && s.uiStatus !== null) {
    v.push(`Desync detectado: UI=${s.uiStatus}, DB=${s.dbStatus}`);
  }

  return { ok: v.length === 0, contractId: "ui_consistency", violations: v };
}

export const CRITICAL_CONTRACTS = {
  draft_integrity: draftIntegrityContract,
  clinical_validity: clinicalValidityContract,
  persistence_safety: persistenceSafetyContract,
  ui_consistency: uiConsistencyContract,
} as const;

export type CriticalContractId = keyof typeof CRITICAL_CONTRACTS;
