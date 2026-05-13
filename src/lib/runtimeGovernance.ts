/**
 * FitJourney — Runtime Governance & Sovereign Shield
 * 
 * Implementação da Blindagem Operacional Final.
 * Fases 2 (Asserts), 3 (Telemetria) e 4 (Auditoria).
 */

import { MealPlanSnapshotV1Schema } from "./snapshot/zodSchema";

// Correlation ID para rastreabilidade E2E
let currentCorrelationId = crypto.randomUUID();

export const resetCorrelationId = () => {
  currentCorrelationId = crypto.randomUUID();
};

export const getCorrelationId = () => currentCorrelationId;

/**
 * Fase 3: Telemetria Operacional
 * Log estruturado para auditoria forense.
 */
export function logSovereignEvent(
  level: "INFO" | "WARN" | "ERROR" | "CRITICAL",
  event: string,
  metadata: {
    instanceId?: string;
    blockId?: string;
    snapshot_id?: string;
    publish_trace?: string;
    hydration_trace?: string;
    runtime_source?: string;
    editor_version?: string;
    [key: string]: any;
  }
) {
  const payload = {
    timestamp: new Date().toISOString(),
    correlation_id: currentCorrelationId,
    level,
    event,
    ...metadata,
  };

  console.log(`[SOVEREIGN_TELEMETRY][${level}] ${event}`, JSON.stringify(payload, null, 2));

  // Em produção, isso poderia ir para Sentry/LogDNA/Supabase Logs
  if (level === "CRITICAL" || level === "ERROR") {
    // throw new Error(`[CRITICAL_GOVERNANCE_VIOLATION] ${event}`);
  }
}

/**
 * Fase 2: Runtime Guards Anti-Legado
 * Detecta e bloqueia o uso de funções proibidas.
 */
export function assertSovereignRuntime(context: string) {
  // Verificação de stack trace para detectar chamadas proibidas (exemplo simplificado)
  const stack = new Error().stack || "";
  
  const forbiddenPatterns = [
    "normalizeV2ToV3",
    "foodNormalization",
    "normalizeFood",
    "recalculateMacros",
    "regex",
    "BASE_FOODS",
    "portion-display",
    "assume",
    "infer"
  ];

  for (const pattern of forbiddenPatterns) {
    if (stack.includes(pattern)) {
      logSovereignEvent("CRITICAL", "LEGADO_DETECTADO_EM_RUNTIME", {
        context,
        pattern,
        stack: stack.split("\n").slice(0, 5).join("\n"),
      });
      throw new Error(`[SOVEREIGN_VIOLATION] Uso de motor legado detectado: ${pattern} em ${context}`);
    }
  }
}

/**
 * Fase 1 & 2: Validação de Snapshot
 */
export function validateMealPlanSnapshot(snapshot: any, context: string) {
  try {
    const result = MealPlanSnapshotV1Schema.parse(snapshot);
    logSovereignEvent("INFO", "SNAPSHOT_VALIDADO", {
      context,
      snapshot_id: snapshot.hash || "unknown",
      editor_version: snapshot.plan?.editor_version || "v3",
    });
    return result;
  } catch (error: any) {
    logSovereignEvent("CRITICAL", "SNAPSHOT_INVALIDO", {
      context,
      error: error.issues || error.message,
      raw_snapshot: snapshot,
    });
    throw new Error(`[SOVEREIGN_VIOLATION] Snapshot corrompido ou incompleto detectado em ${context}. O sistema RECUSA processar dados não-determinísticos.`);
  }
}

/**
 * Fase 4: Auditoria Automática Anti-Regressão
 * Mock para o script de auditoria que pode ser rodado via CLI ou check.
 */
export function runAntiRegressionAudit() {
  const report = {
    timestamp: new Date().toISOString(),
    status: "SEGURO",
    findings: [] as string[],
  };

  // Aqui entrariam verificações estáticas via regex no código (será feito via script shell)
  
  return report;
}
