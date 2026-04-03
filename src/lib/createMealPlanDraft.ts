import { supabase } from "@/integrations/supabase/client";
import { getTenantIdForInsert } from "@/lib/tenantQueryHelpers";

interface CreateMealPlanDraftInput {
  nutritionistId: string;
  patientId: string;
  tenantId: string | null;
  title?: string;
  description?: string | null;
  startDate?: string;
}

export async function createMealPlanDraft({
  nutritionistId,
  patientId,
  tenantId,
  title = "Plano Alimentar",
  description = null,
  startDate = new Date().toISOString().split("T")[0],
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
      editor_version: "v2",
      generation_source: "assisted_engine_v2",
      ...getTenantIdForInsert(tenantId),
    } as any)
    .select("id")
    .single();
}