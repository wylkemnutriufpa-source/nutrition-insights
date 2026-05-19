export type CriticalContractId = 
  | "draft_integrity"
  | "clinical_validity"
  | "engine_determinism"
  | "persistence_safety"
  | "ui_consistency";

export const draftIntegrityContract = (opts: any) => {
  if (!opts.meals) return { ok: false, violations: ["meals nunca pode ser null"] };
  const ids = new Set();
  for (const item of opts.items || []) {
    if (ids.has(item.instanceId)) return { ok: false, violations: ["instanceId duplicado"] };
    ids.add(item.instanceId);
  }
  return { ok: true, violations: [] };
};

export const clinicalValidityContract = (opts: any) => {
  if (opts.isValid === false) return { ok: false, violations: ["Plano clínico inválido detectado"] };
  return { ok: true, violations: [] };
};

export const engineDeterminismContract = (opts: any) => {
  if (opts.mealCount === 0) return { ok: false, violations: ["0 refeições geradas"] };
  if (opts.hasManualOverrides && !opts.overrideConfirmed) return { ok: false, violations: ["sobrescrever manual sem confirmação"] };
  return { ok: true, violations: [] };
};

export const persistenceSafetyContract = (opts: any) => {
  if (opts.isSaving && !opts.draftPersistedBeforeAction) return { ok: false, violations: ["draft deve ser persistido antes"] };
  return { ok: true, violations: [] };
};

export const uiConsistencyContract = (opts: any) => {
  if (opts.dbStatus !== opts.uiStatus && !opts.errorVisible) return { ok: false, violations: ["Erro NÃO está visível"] };
  if (opts.hasInvisibleState) return { ok: false, violations: ["Nenhum estado invisível permitido"] };
  return { ok: true, violations: [] };
};

export const CRITICAL_CONTRACTS: Record<CriticalContractId, (opts: any) => { ok: boolean; violations: string[] }> = {
  draft_integrity: draftIntegrityContract,
  clinical_validity: clinicalValidityContract,
  engine_determinism: engineDeterminismContract,
  persistence_safety: persistenceSafetyContract,
  ui_consistency: uiConsistencyContract
};
