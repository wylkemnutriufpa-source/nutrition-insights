/**
 * 🛡️ INVARIANT ASSERTIONS — FitJourney 2.0
 *
 * ARQUIVO PROTEGIDO — NÃO MODIFICAR SEM REVISÃO ARQUITETURAL
 */

import { SNAPSHOT_REQUIRED_FIELDS, TARGETS_REQUIRED_FIELDS } from './sovereignRules';

const IS_DEV = import.meta.env.DEV;

function forensicLog(rule: string, context: string, data?: any) {
  const msg = `[SOVEREIGN:VIOLATION] Rule "${rule}" violated in "${context}"`;
  console.error(msg, data || '');
  if (IS_DEV) {
    console.trace('[SOVEREIGN] Violação detectada — stack trace:');
  }
}

export function sovereignAssert(condition: boolean, rule: string, context: string, data?: any): void {
  if (!condition) {
    forensicLog(rule, context, data);
    if (IS_DEV) {
      throw new Error(`[SOVEREIGN:VIOLATION] ${rule} em ${context}`);
    }
  }
}

export function assertSnapshotIntegrity(snapshot: any, context: string): void {
  sovereignAssert(!!snapshot, 'SNAPSHOT_NOT_NULL', context, { snapshot });
  sovereignAssert(snapshot.snapshot_version === 'v3', 'SNAPSHOT_VERSION_V3', context, { version: snapshot.snapshot_version });

  for (const field of SNAPSHOT_REQUIRED_FIELDS) {
    sovereignAssert(
      field in snapshot && snapshot[field] !== null && snapshot[field] !== undefined,
      `SNAPSHOT_HAS_${field.toUpperCase()}`,
      context,
      { missing: field }
    );
  }

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

  sovereignAssert(
    typeof snapshot.daily_totals === 'object' && Object.keys(snapshot.daily_totals).length > 0,
    'SNAPSHOT_HAS_DAILY_TOTALS',
    context,
    { daily_totals: snapshot.daily_totals }
  );

  sovereignAssert(
    Array.isArray(snapshot.days) && snapshot.days.length > 0,
    'SNAPSHOT_HAS_DAYS',
    context,
    { days_length: snapshot.days?.length }
  );

  // Garantir que não existam placeholders
  const snapshotStr = JSON.stringify(snapshot);
  sovereignAssert(!snapshotStr.includes('PLACEHOLDER_'), 'NO_PLACEHOLDERS_IN_SNAPSHOT', context);
}

export function assertClinicalMetadataPreserved(
  previousMetadata: any,
  newMetadata: any,
  context: string
): void {
  if (!previousMetadata) return;

  if (previousMetadata.engine_version) {
    sovereignAssert(
      newMetadata?.engine_version === previousMetadata.engine_version,
      'CLINICAL_METADATA_ENGINE_VERSION_PRESERVED',
      context,
      { previous: previousMetadata.engine_version, new: newMetadata?.engine_version }
    );
  }

  if (previousMetadata.tmb) {
    sovereignAssert(
      newMetadata?.tmb === previousMetadata.tmb,
      'CLINICAL_METADATA_TMB_PRESERVED',
      context,
      { previous: previousMetadata.tmb, new: newMetadata?.tmb }
    );
  }
}

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

export function assertChannelNameStable(channelName: string, context: string): void {
  const hasTimestamp = /\d{10,}/.test(channelName);
  sovereignAssert(!hasTimestamp, 'CHANNEL_NAME_NO_TIMESTAMP', context, { channelName });
}

export function assertNotLegacyCode(symbolName: string, context: string): void {
  const DENYLIST = [
    'calculatePrimaryTotals',
    'getBestMealImage',
    'clinicalHumanEngine',
    'generatePlanWithEngine',
    'localGenerateMealPlan',
    'normalizeMealPlan',
    'assertHierarchyIntegrity',
    'hydrationEngine',
    'runtimeInference'
  ];

  if (DENYLIST.includes(symbolName)) {
    forensicLog(
      'LEGACY_CODE_EXECUTION',
      context,
      { symbol: symbolName, message: 'Código legado proibido detectado.' }
    );
    if (IS_DEV) {
      throw new Error(`[SOVEREIGN:LEGACY] "${symbolName}" é código legado proibido.`);
    }
  }
}

