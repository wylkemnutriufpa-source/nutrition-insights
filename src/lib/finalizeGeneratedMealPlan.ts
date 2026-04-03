import { runValidateAndFixMealPlan } from "@/lib/mealPlanValidationFlow";

interface FinalizeGeneratedMealPlanParams {
  planId: string;
  patientId: string;
  userId: string;
  tenantId: string | null;
  flush?: () => Promise<void>;
}

interface FinalizeGeneratedMealPlanResult {
  finalPlanId: string;
  corrected: boolean;
  outcome: Awaited<ReturnType<typeof runValidateAndFixMealPlan>>;
}

export async function finalizeGeneratedMealPlan({
  planId,
  patientId,
  userId,
  tenantId,
  flush = async () => {},
}: FinalizeGeneratedMealPlanParams): Promise<FinalizeGeneratedMealPlanResult> {
  const outcome = await runValidateAndFixMealPlan({
    planId,
    patientId,
    userId,
    tenantId,
    flush,
  });

  return {
    finalPlanId: outcome.kind === "redirect" ? outcome.newPlanId : planId,
    corrected: outcome.kind !== "validated",
    outcome,
  };
}
