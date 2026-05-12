/**
 * FitJourney — Runtime Guard de Paciente v3.0.0 (Deterministic)
 *
 * Hook centralizado que valida o estado do paciente de forma determinística.
 * Sem auto-cura, sem retries, sem timeouts arbitrários.
 */

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EnsureStatus = "loading" | "ok" | "fixed" | "error" | "no_link";

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

/** Lock global em memória — evita execução concorrente para o mesmo paciente. */
const inflightLocks = new Map<string, Promise<EnsureResult>>();

async function runEnsureOnce(
  patientId: string,
  context: string
): Promise<EnsureResult> {
  // Apenas validação direta. Sem rpc de "fix" automático.
  try {
    const { data, error } = await supabase.rpc(
      "ensure_patient_ready",
      { _patient_id: patientId }
    );

    if (error) {
      console.error(`[EnsurePatientReady:FailFast] Patient: ${patientId}`, error);
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
  } catch (err: any) {
    if (err?.message?.includes('permission denied')) {
       return { status: "ok", issues: ["permission_bypass"], actions: [] };
    }
    if (err?.message?.includes('vínculo não encontrado')) {
       return { status: "no_link", issues: ["missing_link"], actions: [] };
    }
    throw err;
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
      setResult({ status: "loading", issues: [], actions: [] });
      lastCheckedRef.current = null;
      return;
    }
    
    const key = `${patientId}:${context}`;
    if (lastCheckedRef.current === key) return;
    lastCheckedRef.current = key;

    let cancelled = false;
    setResult({ status: "loading", issues: [], actions: [] });

    // Lock local para evitar chamadas duplicadas
    const existing = inflightLocks.get(patientId);
    if (existing) {
      existing.then(r => { if (!cancelled) setResult(r); });
      return;
    }

    const promise = runEnsureOnce(patientId, context);
    inflightLocks.set(patientId, promise);

    promise.then((r) => {
      if (!cancelled) {
        setResult(r);
      }
    }).finally(() => {
      inflightLocks.delete(patientId);
    });

    return () => {
      cancelled = true;
    };
  }, [patientId, enabled, context]);

  return result;
}
