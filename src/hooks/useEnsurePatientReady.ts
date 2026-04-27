/**
 * FitJourney — Runtime Guard de Paciente v2.0.0 (Hardened)
 *
 * Hook centralizado que valida e auto-corrige o estado do paciente
 * ANTES de qualquer tela crítica renderizar.
 *
 * Recursos v2.0.0:
 *  - Retry automático até 2x com intervalo de 500ms
 *  - Lock global por paciente (anti race-condition)
 *  - Log detalhado em onboarding_runtime_errors
 *  - Hard validation: lifecycle + pipeline obrigatórios
 *
 * Retorna status: "loading" | "ok" | "fixed" | "error"
 */

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logRegression } from "@/lib/regressionGuard";

export type EnsureStatus = "loading" | "ok" | "fixed" | "error";

export interface EnsureResult {
  status: EnsureStatus;
  issues: string[];
  actions: unknown[];
  errorMessage?: string;
  attempts?: number;
}

interface Options {
  context?: string;
  enabled?: boolean;
}

const MAX_ATTEMPTS = 3; // 1 inicial + 2 retries
const RETRY_DELAY_MS = 500;

/** Lock global em memória — evita execução concorrente para o mesmo paciente. */
const inflightLocks = new Map<string, Promise<EnsureResult>>();
/** Cache de resultado bem-sucedido recente (evita re-checks dentro do mesmo "ciclo"). */
const recentSuccess = new Map<string, { result: EnsureResult; at: number }>();
const SUCCESS_TTL_MS = 30_000;

async function logRuntimeError(
  patientId: string,
  context: string,
  attempt: number,
  errorMessage: string,
  payload: unknown
) {
  try {
    await supabase.from("onboarding_runtime_errors" as any).insert({
      patient_id: patientId,
      context,
      attempt,
      error_message: errorMessage,
      error_payload: payload as any,
    } as any);
  } catch {
    // best-effort — nunca quebrar o fluxo por causa de log
  }
}

async function runEnsureOnce(
  patientId: string,
  context: string
): Promise<EnsureResult> {
  // 1) Runtime fix primeiro (rápido, com cache de 5min no DB)
  const { data: fixData, error: fixError } = await supabase.rpc(
    "run_patient_realtime_fix" as any,
    { _patient_id: patientId }
  );

  if (!fixError && fixData) {
    const fixPayload = fixData as Record<string, unknown>;
    const fixed = (fixPayload.fixed as number) ?? 0;
    const success = (fixPayload.success as boolean) ?? false;
    if (success && fixed > 0) {
      return {
        status: "fixed",
        issues: [`runtime_fix:${fixed}`],
        actions: [fixPayload],
      };
    }
  }

  // 2) Validação final via ensure_patient_ready
  const { data, error } = await supabase.rpc(
    "ensure_patient_ready" as any,
    { _patient_id: patientId }
  );

  if (error) {
    return {
      status: "error",
      issues: ["rpc_failed"],
      actions: [],
      errorMessage: error.message,
    };
  }

  const payload = (data as Record<string, unknown>) ?? {};
  const status = (payload.status as EnsureStatus) ?? "error";
  const issues = (payload.issues as string[]) ?? [];
  const actions = (payload.actions as unknown[]) ?? [];

  return { status, issues, actions };
}

async function ensureWithRetry(
  patientId: string,
  context: string
): Promise<EnsureResult> {
  // Cache curto de sucesso
  const cached = recentSuccess.get(patientId);
  if (cached && Date.now() - cached.at < SUCCESS_TTL_MS) {
    return cached.result;
  }

  // Lock: se já há execução em andamento, espera por ela
  const existing = inflightLocks.get(patientId);
  if (existing) return existing;

  const promise = (async (): Promise<EnsureResult> => {
    let last: EnsureResult = {
      status: "error",
      issues: ["not_executed"],
      actions: [],
    };

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const r = await runEnsureOnce(patientId, context);
        last = { ...r, attempts: attempt };

        if (r.status === "ok" || r.status === "fixed") {
          if (r.status === "fixed") {
            logRegression({
              affected_flow: `runtime_guard:${context}`,
              detected_issue: `auto-fixed: ${r.issues.join(",")}`,
              severity: "low",
              source_layer: "database",
              auto_fallback_applied: true,
              metadata: { issues: r.issues, actions: r.actions, attempt },
            });
          }
          recentSuccess.set(patientId, { result: last, at: Date.now() });
          return last;
        }

        // erro → log + retry
        await logRuntimeError(
          patientId,
          context,
          attempt,
          r.errorMessage ?? `status=${r.status}`,
          { issues: r.issues, actions: r.actions }
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        last = {
          status: "error",
          issues: ["exception"],
          actions: [],
          errorMessage: msg,
          attempts: attempt,
        };
        await logRuntimeError(patientId, context, attempt, msg, null);
      }

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }

    logRegression({
      affected_flow: `runtime_guard:${context}`,
      detected_issue: `unrecoverable after ${MAX_ATTEMPTS} attempts: ${last.issues.join(",")}`,
      severity: "critical",
      source_layer: "database",
      auto_fallback_applied: false,
      metadata: { issues: last.issues, actions: last.actions },
    });

    return last;
  })();

  inflightLocks.set(patientId, promise);
  try {
    return await promise;
  } finally {
    inflightLocks.delete(patientId);
  }
}

export function useEnsurePatientReady(
  patientId: string | null | undefined,
  opts: Options = {}
): EnsureResult {
  const { context = "unknown", enabled = true } = opts;
  const [result, setResult] = useState<EnsureResult>({
    status: "loading",
    issues: [],
    actions: [],
  });
  const lastCheckedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !patientId) {
      if (!patientId && enabled) {
        setResult({ status: "loading", issues: [], actions: [] });
      }
      return;
    }
    
    const key = `${patientId}:${context}`;
    // Force re-check if it's the first time for this patient in this session
    if (lastCheckedRef.current === key) return;
    lastCheckedRef.current = key;

    let cancelled = false;
    setResult({ status: "loading", issues: [], actions: [] });

    console.log(`[EnsurePatientReady] Starting check for ${patientId} context: ${context}`);
    ensureWithRetry(patientId, context).then((r) => {
      if (!cancelled) {
        console.log(`[EnsurePatientReady] Result for ${patientId}: ${r.status}`, r.issues);
        setResult(r);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [patientId, enabled, context]);

  return result;
}
