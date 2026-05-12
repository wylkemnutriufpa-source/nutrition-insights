import { supabase } from "@/integrations/supabase/client";
import { getTenantIdForInsert } from "@/lib/tenantQueryHelpers";

/**
 * Creates an editable draft revision from an existing (immutable) meal plan.
 * Clones the plan metadata + all items into a new draft linked via previous_plan_id.
 */
export async function createPlanRevision({
  sourcePlanId,
  nutritionistId,
  tenantId,
}: {
  sourcePlanId: string;
  nutritionistId: string;
  tenantId: string | null;
}): Promise<{ planId: string | null; error: string | null }> {
  // 1. Fetch source plan
  const { data: source, error: srcErr } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("id", sourcePlanId)
    .single();

  if (srcErr || !source) {
    return { planId: null, error: srcErr?.message || "Plano não encontrado" };
  }

  // 2. Create new draft revision
  const { data: newPlan, error: planErr } = await supabase
    .from("meal_plans")
    .insert({
      nutritionist_id: nutritionistId,
      patient_id: source.patient_id,
      title: `${source.title} (Revisão)`,
      description: source.description,
      start_date: new Date().toISOString().split("T")[0],
      plan_status: "draft",
      is_active: false,
      editor_version: "v2",
      generation_source: "revision",
      previous_plan_id: sourcePlanId,
      ...getTenantIdForInsert(tenantId),
    } as any)
    .select("id")
    .single();

  if (planErr || !newPlan) {
    return { planId: null, error: planErr?.message || "Erro ao criar revisão" };
  }

  // 3. Clone items
  const { data: items } = await supabase
    .from("meal_plan_items")
    .select("*")
    .eq("meal_plan_id", sourcePlanId);

  if (items && items.length > 0) {
    const clonedItems = items.map((item: any) => {
      const { id, created_at, meal_plan_id, ...rest } = item;
      return {
        ...rest,
        meal_plan_id: newPlan.id,
      };
    });

    await supabase.from("meal_plan_items").insert(clonedItems as any);
  }

  return { planId: newPlan.id, error: null };
}
