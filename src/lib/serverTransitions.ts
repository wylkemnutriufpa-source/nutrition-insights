/**
 * FitJourney — Server-Authoritative Transitions Layer
 * 
 * ALL critical state changes MUST go through this module.
 * No component should directly .update() journey_status, lifecycle_state,
 * plan_status, or onboarding release.
 * 
 * Responsibility model:
 * - journey_status → CRM/commercial progression ONLY
 * - lifecycle_state → clinical progression ONLY (resolved by RPC)
 * - plan_status + is_active → unified via publish_meal_plan RPC
 */

import { supabase } from "@/integrations/supabase/client";
import { generateAndPersistMealPlanSnapshot } from "@/lib/snapshot/persistSnapshot";

/**
 * Onda 1 — Snapshot determinístico:
 * Após qualquer publicação bem-sucedida, gera e persiste o snapshot imutável.
 * NÃO bloqueia o fluxo: falhas são apenas logadas. Nenhuma camada lê o snapshot
 * nesta onda — apenas geração + persistência.
 */
async function persistSnapshotAfterPublish(planId: string): Promise<void> {
  try {
    const result = await generateAndPersistMealPlanSnapshot(planId);
    if (!result.success) {
      console.warn("[ServerTransition] snapshot persistence soft-failed:", result.error);
    }
  } catch (e) {
    console.warn("[ServerTransition] snapshot persistence threw (ignored):", e);
  }
}

export interface TransitionResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Release onboarding for a patient (server-authoritative).
 */
export async function releaseOnboarding(
  patientId: string,
  nutritionistId: string,
  releaseConfig: Record<string, unknown> = {}
): Promise<TransitionResult> {
  const { data, error } = await supabase.rpc(
    "release_patient_onboarding" as any,
    {
      _patient_id: patientId,
      _nutritionist_id: nutritionistId,
      _release_config: releaseConfig,
    }
  );

  if (error) {
    console.error("[ServerTransition] releaseOnboarding failed:", error);
    return { success: false, error: error.message };
  }

  // Handle RPC returning error in the result object
  const result = data as Record<string, unknown>;
  if (result && result.success === false) {
    return { success: false, error: (result.error as string) || "Erro ao liberar onboarding" };
  }

  return { success: true, data: result };
}

/**
 * Transition journey status with validation (server-authoritative).
 */
export async function transitionJourneyStatus(
  patientId: string,
  nutritionistId: string,
  newStatus: string
): Promise<TransitionResult> {
  const { data, error } = await supabase.rpc(
    "transition_journey_status" as any,
    {
      _patient_id: patientId,
      _nutritionist_id: nutritionistId,
      _new_status: newStatus,
    }
  );

  if (error) {
    console.error("[ServerTransition] transitionJourneyStatus failed:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Record<string, unknown> };
}

/**
 * Publish a meal plan (server-authoritative).
 */
export async function publishMealPlan(
  planId: string,
  nutritionistId: string
): Promise<TransitionResult> {
  const { data, error } = await supabase.rpc(
    "publish_meal_plan" as any,
    {
      _plan_id: planId,
      _nutritionist_id: nutritionistId,
    }
  );

  if (error) {
    console.error("[ServerTransition] publishMealPlan failed:", error);
    return { success: false, error: error.message };
  }

  const result = data as Record<string, unknown>;
  if (result && result.success === false) {
    return { success: false, error: (result.error as string) || "Erro ao publicar", data: result };
  }

  return { success: true, data: result };
}

/**
 * Activate a meal plan using existing RPC (already server-authoritative).
 */
export async function activateMealPlan(planId: string): Promise<TransitionResult> {
  const { error } = await supabase.rpc("activate_meal_plan" as any, { _plan_id: planId });

  if (error) {
    console.error("[ServerTransition] activateMealPlan failed:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Deactivate a meal plan (server-authoritative).
 * Replaces direct .update({ is_active: false }) on meal_plans.
 */
export async function deactivateMealPlan(
  planId: string,
  nutritionistId: string
): Promise<TransitionResult> {
  const { data, error } = await supabase.rpc(
    "deactivate_meal_plan" as any,
    {
      _plan_id: planId,
      _nutritionist_id: nutritionistId,
    }
  );

  if (error) {
    console.error("[ServerTransition] deactivateMealPlan failed:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Record<string, unknown> };
}

/**
 * Approve and publish a plan atomically (server-authoritative).
 * Used by onboarding approval queue.
 */
export async function approveAndPublishPlan(
  planId: string,
  nutritionistId: string,
  startDate?: string,
  durationDays?: number
): Promise<TransitionResult> {
  const params: Record<string, unknown> = {
    _plan_id: planId,
    _nutritionist_id: nutritionistId,
  };
  if (startDate) params._start_date = startDate;
  if (durationDays) params._duration_days = durationDays;

  const { data, error } = await supabase.rpc(
    "approve_and_publish_plan" as any,
    params
  );

  if (error) {
    console.error("[ServerTransition] approveAndPublishPlan failed:", error);
    return { success: false, error: error.message };
  }

  const result = data as Record<string, unknown>;
  if (result && result.success === false) {
    return { success: false, error: (result.error as string) || "Erro ao aprovar e publicar", data: result };
  }

  return { success: true, data: result };
}

/**
 * Reject a meal plan (server-authoritative).
 * Replaces direct .update({ plan_status: 'rejected', is_active: false }).
 */
export async function rejectMealPlan(
  planId: string,
  nutritionistId: string,
  reason?: string
): Promise<TransitionResult> {
  const { data, error } = await supabase.rpc(
    "reject_meal_plan" as any,
    {
      _plan_id: planId,
      _nutritionist_id: nutritionistId,
      _reason: reason || "",
    }
  );

  if (error) {
    console.error("[ServerTransition] rejectMealPlan failed:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Record<string, unknown> };
}

/**
 * Preview orphan onboarding pipelines before archival (safe preview).
 */
export async function previewOrphanPipelines(): Promise<TransitionResult & { pipelines?: OrphanPipelinePreview[] }> {
  const { data, error } = await supabase.rpc("preview_orphan_onboarding_pipelines" as any);

  if (error) {
    console.error("[ServerTransition] previewOrphanPipelines failed:", error);
    return { success: false, error: error.message };
  }

  return { success: true, pipelines: (data as OrphanPipelinePreview[]) || [] };
}

export interface OrphanPipelinePreview {
  pipeline_id: string;
  patient_id: string;
  nutritionist_id: string;
  pipeline_status: string;
  created_at: string;
  archival_reason: string;
}

/**
 * Archive orphan onboarding pipelines (admin/maintenance).
 */
export async function archiveOrphanPipelines(): Promise<TransitionResult> {
  const { data, error } = await supabase.rpc("archive_orphan_onboarding_pipelines" as any);

  if (error) {
    console.error("[ServerTransition] archiveOrphanPipelines failed:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Record<string, unknown> };
}

/**
 * Pipeline observability — log start/finish/failure of background jobs.
 */
export async function logPipelineStart(pipelineName: string, metadata?: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await supabase.rpc("log_pipeline_execution" as any, {
    _pipeline_name: pipelineName,
    _status: "started",
    _metadata: metadata || {},
  });

  if (error) {
    console.error("[Pipeline] Failed to log start:", error);
    return null;
  }
  return data as string;
}

export async function logPipelineFinish(
  runId: string,
  status: "completed" | "failed" | "partial",
  patientsProcessed = 0,
  errorsCount = 0,
  errorDetails?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.rpc("finalize_pipeline_execution" as any, {
    _id: runId,
    _status: status,
    _patients_processed: patientsProcessed,
    _errors_count: errorsCount,
    _error_details: errorDetails || null,
  });

  if (error) {
    console.error("[Pipeline] Failed to log finish:", error);
  }
}

/**
 * Transition a plan to "under_professional_review" (server-authoritative).
 */
export async function transitionPlanToReview(
  planId: string,
  nutritionistId: string
): Promise<TransitionResult> {
  const { data, error } = await supabase.rpc(
    "transition_plan_to_review" as any,
    {
      _plan_id: planId,
      _nutritionist_id: nutritionistId,
    }
  );

  if (error) {
    console.error("[ServerTransition] transitionPlanToReview failed:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Record<string, unknown> };
}

/**
 * Save a plan as approved (server-authoritative).
 */
export async function savePlanAsApproved(
  planId: string,
  nutritionistId: string
): Promise<TransitionResult> {
  const { data, error } = await supabase.rpc(
    "save_plan_as_approved" as any,
    {
      _plan_id: planId,
      _nutritionist_id: nutritionistId,
    }
  );

  if (error) {
    console.error("[ServerTransition] savePlanAsApproved failed:", error);
    return { success: false, error: error.message };
  }

  const result = data as Record<string, unknown>;
  if (result && result.success === false) {
    return { success: false, error: (result.error as string) || "Erro ao aprovar", data: result };
  }

  return { success: true, data: result };
}

/**
 * Reconcile patient_state based on commercial and clinical reality.
 * (ETAPA 3 - Contratos de Estado)
 */
export async function reconcilePatientState(patientId: string): Promise<TransitionResult> {
  const { data, error } = await supabase.rpc(
    "reconcile_patient_state" as any,
    { _patient_id: patientId }
  );

  if (error) {
    console.error("[ServerTransition] reconcilePatientState failed:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as Record<string, unknown> };
}

/**
 * Protocol domain resolution helper.
 */
export const PROTOCOL_DOMAIN = {
  RUNTIME: "protocols" as const,
  LIBRARY: "nutrition_protocols" as const,
} as const;

/**
 * Plan state interpretation helper.
 * 
 * AUTHORITATIVE MODEL:
 * - A plan is considered "active" if and only if: is_active = true AND plan_status = 'published_to_patient'
 * - is_active = true with plan_status != 'published_to_patient' is an INCONSISTENCY
 * - plan_status = 'published_to_patient' with is_active = false means SUPERSEDED (valid)
 */
export function resolvePlanState(plan: { plan_status?: string; is_active?: boolean }) {
  const isActive = plan.is_active === true;
  const status = plan.plan_status || "draft";
  const isPublished = status === "published_to_patient" || status === "published";

  return {
    isEffective: isActive && isPublished,
    isDraft: !isPublished && !isActive && !["approved", "rejected", "under_professional_review"].includes(status),
    isApproved: status === "approved",
    isUnderReview: status === "under_professional_review",
    isRejected: status === "rejected",
    isSuperseded: isPublished && !isActive,
    hasInconsistency: isActive && !isPublished,
    label: isActive && isPublished
      ? "Ativo"
      : isPublished && !isActive
        ? "Supersedido"
        : status === "approved"
          ? "Aprovado"
          : status === "under_professional_review"
            ? "Em revisão"
            : status === "rejected"
              ? "Rejeitado"
              : isActive && !isPublished
                ? "⚠️ Inconsistente"
                : status === "draft_auto_generated"
                  ? "Rascunho (IA)"
                  : "Rascunho",
    badgeClass: isActive && isPublished
      ? "bg-success/10 text-success"
      : status === "approved"
        ? "bg-blue-500/10 text-blue-600"
        : status === "under_professional_review"
          ? "bg-amber-500/10 text-amber-600"
          : status === "rejected"
            ? "bg-destructive/10 text-destructive"
            : isActive && !isPublished
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
  };
}
