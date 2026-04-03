import { supabase } from "@/integrations/supabase/client";

const INVALID_PLAN_STATUSES = new Set(["archived", "rejected"]);
const CANDIDATE_PLAN_STATUSES = [
  "draft",
  "draft_auto_generated",
  "draft_auto_corrected",
  "under_professional_review",
  "approved",
  "published_to_patient",
];

export interface OnboardingPlanSnapshot {
  id: string;
  plan_status: string | null;
  overall_validation_status: string | null;
  hasItems: boolean;
  isUsable: boolean;
}

export interface ResolvedPatientIdentity {
  canonicalId: string;
  profileId: string;
  allIds: string[];
}

export interface OnboardingPipelineSnapshot {
  id: string;
  patient_id: string;
  generated_plan_id: string | null;
  plan_generated: boolean | null;
}

export async function resolvePatientIdentity(patientId: string): Promise<ResolvedPatientIdentity> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, user_id")
    .or(`id.eq.${patientId},user_id.eq.${patientId}`)
    .maybeSingle();

  if (error) throw error;

  return {
    canonicalId: data?.user_id ?? patientId,
    profileId: data?.id ?? patientId,
    allIds: Array.from(new Set([data?.user_id, data?.id, patientId].filter(Boolean))) as string[],
  };
}

export async function inspectOnboardingPlan(planId: string): Promise<OnboardingPlanSnapshot | null> {
  const [{ data: plan, error: planError }, { count, error: countError }] = await Promise.all([
    supabase
      .from("meal_plans")
      .select("id, plan_status, overall_validation_status")
      .eq("id", planId)
      .maybeSingle(),
    supabase
      .from("meal_plan_items")
      .select("id", { count: "exact", head: true })
      .eq("meal_plan_id", planId),
  ]);

  if (planError) throw planError;
  if (countError) throw countError;
  if (!plan) return null;

  const hasItems = Boolean(count && count > 0);
  const isUsable = !INVALID_PLAN_STATUSES.has(plan.plan_status || "")
    && hasItems;

  return {
    id: plan.id,
    plan_status: plan.plan_status,
    overall_validation_status: plan.overall_validation_status,
    hasItems,
    isUsable,
  };
}

export async function resolveLatestUsableOnboardingPlan(
  patientId: string,
  nutritionistId: string,
): Promise<OnboardingPlanSnapshot | null> {
  const patientIdentity = await resolvePatientIdentity(patientId);

  const { data: plans, error } = await supabase
    .from("meal_plans")
    .select("id")
    .in("patient_id", patientIdentity.allIds)
    .eq("nutritionist_id", nutritionistId)
    .in("plan_status", CANDIDATE_PLAN_STATUSES)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  for (const plan of plans || []) {
    const snapshot = await inspectOnboardingPlan(plan.id);
    if (snapshot?.isUsable) return snapshot;
  }

  return null;
}

export async function resolveLatestOnboardingPipeline(
  patientId: string,
): Promise<OnboardingPipelineSnapshot | null> {
  const patientIdentity = await resolvePatientIdentity(patientId);

  const { data, error } = await supabase
    .from("onboarding_pipelines" as any)
    .select("id, patient_id, generated_plan_id, plan_generated")
    .in("patient_id", patientIdentity.allIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return (data as OnboardingPipelineSnapshot | null) ?? null;
}

export async function syncPipelineGeneratedPlan(pipelineId: string, planId: string) {
  return supabase
    .from("onboarding_pipelines" as any)
    .update({
      generated_plan_id: planId,
      plan_generated: true,
    } as any)
    .eq("id", pipelineId);
}