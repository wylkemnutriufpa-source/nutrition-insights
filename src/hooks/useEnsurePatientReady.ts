/**
 * FitJourney — Runtime Guard de Paciente v1.0.0
 *
 * Hook centralizado que valida e auto-corrige o estado do paciente
 * ANTES de qualquer tela crítica renderizar.
 *
 * Chama a RPC `ensure_patient_ready` que:
 *  - valida lifecycle, onboarding_pipeline, vínculo, perfil e role
 *  - executa fix_patient_integrity automaticamente se houver inconsistência
 *  - registra cada execução em runtime_patient_fixes
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
}

interface Options {
  /** Identificador da rota/tela (para logs). Ex: "anamnese" */
  context?: string;
  /** Desabilita o guard (ex: ainda carregando user). */
  enabled?: boolean;
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
    if (!enabled || !patientId) return;
    // Evita re-execução desnecessária para o mesmo paciente
    if (lastCheckedRef.current === `${patientId}:${context}`) return;
    lastCheckedRef.current = `${patientId}:${context}`;

    let cancelled = false;
    setResult({ status: "loading", issues: [], actions: [] });

    (async () => {
      try {
        const { data, error } = await supabase.rpc(
          "ensure_patient_ready" as any,
          { _patient_id: patientId }
        );

        if (cancelled) return;

        if (error) {
          logRegression({
            affected_flow: `runtime_guard:${context}`,
            detected_issue: error.message,
            severity: "high",
            source_layer: "database",
            auto_fallback_applied: false,
          });
          setResult({
            status: "error",
            issues: ["rpc_failed"],
            actions: [],
            errorMessage: error.message,
          });
          return;
        }

        const payload = (data as Record<string, unknown>) ?? {};
        const status = (payload.status as EnsureStatus) ?? "error";
        const issues = (payload.issues as string[]) ?? [];
        const actions = (payload.actions as unknown[]) ?? [];

        if (status === "fixed") {
          logRegression({
            affected_flow: `runtime_guard:${context}`,
            detected_issue: `auto-fixed: ${issues.join(",")}`,
            severity: "low",
            source_layer: "database",
            auto_fallback_applied: true,
            metadata: { issues, actions },
          });
        } else if (status === "error") {
          logRegression({
            affected_flow: `runtime_guard:${context}`,
            detected_issue: `unrecoverable: ${issues.join(",")}`,
            severity: "critical",
            source_layer: "database",
            auto_fallback_applied: false,
            metadata: { issues, actions },
          });
        }

        setResult({ status, issues, actions });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setResult({
          status: "error",
          issues: ["exception"],
          actions: [],
          errorMessage: msg,
        });
      }
    })();

    return () => { cancelled = true; };
  }, [patientId, enabled, context]);

  return result;
}
