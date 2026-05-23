/**
 * 🛡️ INVARIANT ASSERTIONS — FitJourney 2.0
 *
 * ARQUIVO PROTEGIDO — NÃO MODIFICAR SEM REVISÃO ARQUITETURAL
 *
 * Asserts obrigatórios que devem ser chamados em pontos críticos.
 * Em desenvolvimento: throw + log forense.
 * Em produção: log forense sem throw (não quebra o usuário).
 */

import { SNAPSHOT_REQUIRED_FIELDS, TARGETS_REQUIRED_FIELDS, ITEM_REQUIRED_FIELDS } from './sovereignRules';

const IS_DEV = import.meta.env.DEV;

/** Log forense estruturado — sempre visível no console */
function forensicLog(rule: string, context: string, data?: any) {
  const msg = `[SOVEREIGN:VIOLATION] Rule "${rule}" violated in "${context}"`;
  console.error(msg, data || '');
  if (IS_DEV) {
    console.trace('[SOVEREIGN] Violação detectada — stack trace:');
  }
}

/** Assert soberano — throw em dev, log em prod */
function sovereignAssert(condition: boolean, rule: string, context: string, data?: any): void {
  if (!condition) {
    forensicLog(rule, context, data);
    if (IS_DEV) {
      throw new Error(`[SOVEREIGN:VIOLATION] ${rule} em ${context}`);
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// SNAPSHOT ASSERTIONS
// ════════════════════════════════════════════════════════════════════

/**
 * Valida que um snapshot V3 tem todos os campos obrigatórios.
 * Chamar antes de publicar e antes de renderizar no Patient App.
 */
export function assertSnapshotIntegrity(snapshot: any, context: string): void {
  sovereignAssert(
    !!snapshot,
    'SNAPSHOT_NOT_NULL',
    context,
    { snapshot }
  );

  sovereignAssert(
    snapshot.snapshot_version === 'v3',
    'SNAPSHOT_VERSION_V3',
    context,
    { version: snapshot.snapshot_version }
  );

  for (const field of SNAPSHOT_REQUIRED_FIELDS) {
    sovereignAssert(
      field in snapshot && snapshot[field] !== null && snapshot[field] !== undefined,
      `SNAPSHOT_HAS_${field.toUpperCase()}`,
      context,
      { missing: field }
    );
  }

  // targets obrigatório
  if (snapshot.targets) {
    for (const field of TARGETS_REQUIRED_FIELDS) {
      sovereignAssert(
        typeof snapshot.targets[field] === 'number',
        `TARGETS_HAS_${field.toUpperCase()}`,
        context,
        { targets: snapshot.targets }
      );
    }
  }

  // daily_totals obrigatório
  sovereignAssert(
    typeof snapshot.daily_totals === 'object' && Object.keys(snapshot.daily_totals).length > 0,
    'SNAPSHOT_HAS_DAILY_TOTALS',
    context,
    { daily_totals: snapshot.daily_totals }
  );

  // days obrigatório e não-vazio
  sovereignAssert(
    Array.isArray(snapshot.days) && snapshot.days.length > 0,
    'SNAPSHOT_HAS_DAYS',
    context,
    { days_length: snapshot.days?.length }
  );
}

/**
 * Valida que clinical_metadata original não foi perdido na republicação.
 */
export function assertClinicalMetadataPreserved(
  previousMetadata: any,
  newMetadata: any,
  context: string
): void {
  if (!previousMetadata) return; // primeiro plano, sem metadata anterior

  // engine_version original deve ser preservado
  if (previousMetadata.engine_version) {
    sovereignAssert(
      newMetadata?.engine_version === previousMetadata.engine_version,
      'CLINICAL_METADATA_ENGINE_VERSION_PRESERVED',
      context,
      { previous: previousMetadata.engine_version, new: newMetadata?.engine_version }
    );
  }

  // TMB/TDEE originais devem ser preservados
  if (previousMetadata.tmb) {
    sovereignAssert(
      newMetadata?.tmb === previousMetadata.tmb,
      'CLINICAL_METADATA_TMB_PRESERVED',
      context,
      { previous: previousMetadata.tmb, new: newMetadata?.tmb }
    );
  }
}

/**
 * Valida revision_number — deve ser monotônico (sempre crescente)
 */
export function assertRevisionMonotonic(
  previousRevision: number,
  newRevision: number,
  context: string
): void {
  sovereignAssert(
    newRevision > previousRevision,
    'REVISION_NUMBER_MONOTONIC',
    context,
    { previous: previousRevision, new: newRevision }
  );
}

// ════════════════════════════════════════════════════════════════════
// REALTIME ASSERTIONS
// ════════════════════════════════════════════════════════════════════

/**
 * Valida que nome de canal não contém timestamp (previne canais duplicados).
 */
export function assertChannelNameStable(channelName: string, context: string): void {
  // Date.now() retorna números de 13 dígitos
  const hasTimestamp = /\d{10,}/.test(channelName);
  sovereignAssert(
    !hasTimestamp,
    'CHANNEL_NAME_NO_TIMESTAMP',
    context,
    { channelName }
  );
}

// ════════════════════════════════════════════════════════════════════
// ANTI-LEGACY DETECTOR
// ════════════════════════════════════════════════════════════════════

/**
 * Guard anti-legado: detecta se código proibido está tentando executar.
 * Chamar no início de funções que foram marcadas para deleção.
 */
export function assertNotLegacyCode(symbolName: string, context: string): void {
  const DENYLIST = [
    'calculatePrimaryTotals',
    'getBestMealImage',
    'clinicalHumanEngine',
    'generatePlanWithEngine',
    'localGenerateMealPlan',
  ];

  if (DENYLIST.includes(symbolName)) {
    forensicLog(
      'LEGACY_CODE_EXECUTION',
      context,
      { symbol: symbolName, message: 'Este símbolo foi marcado para deleção e não deve ter lógica ativa.' }
    );
    if (IS_DEV) {
      throw new Error(
        `[SOVEREIGN:LEGACY] "${symbolName}" é código legado proibido. ` +
        `Frontend não pode calcular, inferir ou normalizar. ` +
        `Redirecione para o snapshot soberano.`
      );
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// PRODUCTION INTEGRITY CHECK
// ════════════════════════════════════════════════════════════════════

export interface IntegrityCheckResult {
  ok: boolean;
  violations: string[];
  warnings: string[];
}

/**
 * Verificação de integridade executada no startup/build.
 * Valida que o sistema está em estado soberano.
 */
export function productionIntegrityCheck(): IntegrityCheckResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Verificar se sovereign module está carregado
  try {
    const { extractMealsFromSnapshot } = require('./extractMealsFromSnapshot');
    if (typeof extractMealsFromSnapshot !== 'function') {
      violations.push('extractMealsFromSnapshot não está disponível');
    }
  } catch {
    violations.push('Módulo sovereign não carregado');
  }

  // Log resultado
  if (violations.length > 0) {
    console.error('[SOVEREIGN:INTEGRITY] Violações encontradas:', violations);
  } else {
    console.log('[SOVEREIGN:INTEGRITY] ✅ Sistema soberano íntegro');
  }

  return { ok: violations.length === 0, violations, warnings };
}
