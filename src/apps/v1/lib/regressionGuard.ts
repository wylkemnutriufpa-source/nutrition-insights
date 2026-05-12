/**
 * FitJourney — Regression Guard Logger (BLOCO 8)
 * 
 * Registra regressões detectadas para histórico e análise.
 * Fire-and-forget — nunca bloqueia UI.
 */

import { supabase } from "@v1/integrations/supabase/client";
import { logWarn } from "@v1/lib/monitoring";

export type RegressionSeverity = "critical" | "high" | "medium" | "low";
export type SourceLayer = "frontend" | "backend" | "database" | "edge_function";

interface RegressionLog {
  affected_flow: string;
  detected_issue: string;
  severity: RegressionSeverity;
  source_layer: SourceLayer;
  auto_fallback_applied: boolean;
  metadata?: Record<string, unknown>;
}

/** Log a detected regression (fire-and-forget) */
export function logRegression(log: RegressionLog) {
  // Always log to console for immediate visibility
  const prefix = log.auto_fallback_applied ? "🛡️ AUTO-HEALED" : "⚠️ REGRESSION";
  console.warn(`[${prefix}] ${log.affected_flow}: ${log.detected_issue} (${log.severity})`);

  // Try to persist to DB (fire-and-forget, never blocks)
  supabase
    .from("regression_guard_logs" as any)
    .insert({
      affected_flow: log.affected_flow,
      detected_issue: log.detected_issue,
      severity: log.severity,
      source_layer: log.source_layer,
      auto_fallback_applied: log.auto_fallback_applied,
      metadata: log.metadata ?? {},
    } as any)
    .then(({ error }) => {
      if (error) {
        // Silently fall back — don't crash the app because of logging
        logWarn("RegressionGuard", `Falha ao salvar log: ${error.message}`);
      }
    });
}

/** Helper: log a compatibility fix that was auto-applied */
export function logAutoHeal(flow: string, issue: string, layer: SourceLayer = "frontend") {
  logRegression({
    affected_flow: flow,
    detected_issue: issue,
    severity: "low",
    source_layer: layer,
    auto_fallback_applied: true,
  });
}

/** Helper: log a critical regression detected */
export function logCriticalRegression(flow: string, issue: string, layer: SourceLayer = "frontend") {
  logRegression({
    affected_flow: flow,
    detected_issue: issue,
    severity: "critical",
    source_layer: layer,
    auto_fallback_applied: false,
  });
}
