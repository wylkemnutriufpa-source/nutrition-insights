import { supabase } from "@/integrations/supabase/client";
import { getTenantIdForInsert } from "@/lib/tenantQueryHelpers";

interface CreateMealPlanDraftInput {
  nutritionistId: string;
  patientId: string;
  tenantId: string | null;
  title?: string;
  description?: string | null;
  startDate?: string;
  editorVersion?: "v2" | "v3";
}

export async function createMealPlanDraft({
  nutritionistId,
  patientId,
  tenantId,
  title = "Plano Alimentar",
  description = null,
  startDate = new Date().toISOString().split("T")[0],
  editorVersion = "v2",
}: CreateMealPlanDraftInput) {
  return supabase
    .from("meal_plans")
    .insert({
      nutritionist_id: nutritionistId,
      patient_id: patientId,
      title,
      description,
      start_date: startDate,
      plan_status: "draft",
      is_active: false,
      editor_version: editorVersion,
      plan_mode: "single_day",
      generation_source: editorVersion === "v3" ? "assisted_engine_v3" : "assisted_engine_v2",
      ...getTenantIdForInsert(tenantId),
    } as any)
    .select("id, editor_version")
    .single();
}