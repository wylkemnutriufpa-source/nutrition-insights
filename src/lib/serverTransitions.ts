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

export interface TransitionResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Release onboarding for a patient (server-authoritative).
 * Replaces direct .update() on nutritionist_patients + onboarding_pipelines.
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

  return { success: true, data: data as Record<string, unknown> };
}

/**
 * Transition journey status with validation (server-authoritative).
 * Replaces direct .update({ journey_status }) calls.
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
 * Handles: deactivate old plans, activate new, set plan_status=published,
 * update journey_status if needed, notify patient.
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

  return { success: true, data: data as Record<string, unknown> };
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
 * Should be called AFTER previewOrphanPipelines to confirm.
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
 * Protocol domain resolution helper.
 * 
 * CANONICAL RULE:
 * - `protocols` table = runtime instances (activated for patients, referenced by checkins)
 * - `nutrition_protocols` table = library/templates (browsable catalog)
 * 
 * When activating a protocol for a patient → use `protocols`
 * When browsing available protocols → use `nutrition_protocols`
 */
export const PROTOCOL_DOMAIN = {
  /** Runtime instances — activated protocols, FK references */
  RUNTIME: "protocols" as const,
  /** Library/catalog — browsable templates */
  LIBRARY: "nutrition_protocols" as const,
} as const;

/**
 * Plan state interpretation helper.
 * 
 * AUTHORITATIVE MODEL:
 * - A plan is considered "active" if and only if: is_active = true AND plan_status = 'published'
 * - is_active = true with plan_status != 'published' is an INCONSISTENCY
 * - plan_status = 'published' with is_active = false means SUPERSEDED (valid)
 */
export function resolvePlanState(plan: { plan_status?: string; is_active?: boolean }) {
  const isActive = plan.is_active === true;
  const isPublished = plan.plan_status === "published";

  return {
    /** The plan is actively governing the patient */
    isEffective: isActive && isPublished,
    /** Draft or auto-generated, not yet published */
    isDraft: !isPublished && !isActive,
    /** Was published but superseded by another plan */
    isSuperseded: isPublished && !isActive,
    /** Data inconsistency: active but not published */
    hasInconsistency: isActive && !isPublished,
    /** Human-readable label */
    label: isActive && isPublished
      ? "Ativo"
      : isPublished && !isActive
        ? "Publicado (inativo)"
        : isActive && !isPublished
          ? "⚠️ Inconsistente"
          : plan.plan_status === "draft_auto_generated"
            ? "Rascunho (IA)"
            : "Rascunho",
  };
}
