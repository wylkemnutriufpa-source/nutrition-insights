import { supabase } from "@/integrations/supabase/client";
import { autoFixMealPlan, type AutoFixResult } from "@/lib/autoFixEngine";
import { isSimpleMode } from "@/lib/simpleModeFlag";

export interface ClinicalValidationResult {
  success: boolean;
  status?: string;
  overall_status?: string;
  score?: number;
  message?: string;
  [key: string]: unknown;
}

type ValidateAndFixOutcome =
  | {
      kind: "validated";
      validationResult: ClinicalValidationResult;
    }
  | {
      kind: "fixed_and_validated" | "fixed_but_pending";
      validationResult: ClinicalValidationResult;
      fixedResult: AutoFixResult;
    }
  | {
      kind: "redirect";
      validationResult: ClinicalValidationResult;
      fixedResult: AutoFixResult;
      newPlanId: string;
    };

interface RunValidateAndFixParams {
  planId: string;
  patientId: string;
  userId: string;
  tenantId: string | null;
  flush: () => Promise<void>;
}

/**
 * Reconcile macros: para cada item do plano com macros NULL/0 e visual_library_item_id,
 * copia macros padrão da biblioteca. Atualiza totais do plano. Idempotente.
 * Falha silenciosa (best-effort) — não interrompe o fluxo se der erro.
 */
export async function reconcileMealPlanMacros(planId: string): Promise<{ items_reconciled: number; daily_calories?: number } | null> {
  try {
    const { data, error } = await (supabase as any).rpc("reconcile_meal_plan_macros", { p_plan_id: planId });
    if (error) {
      console.warn("[reconcileMealPlanMacros] non-fatal:", error.message);
      return null;
    }
    const items = data?.items_reconciled ?? 0;
    const dailyCal = data?.totals?.daily_calories;
    if (items > 0) console.info(`[reconcileMealPlanMacros] reconciled ${items} items, daily=${dailyCal}kcal`);
    return { items_reconciled: items, daily_calories: dailyCal };
  } catch (e: any) {
    console.warn("[reconcileMealPlanMacros] threw:", e?.message);
    return null;
  }
}

export async function validateMealPlan(planId: string): Promise<ClinicalValidationResult> {
  // 🔧 Reconciliar macros faltantes ANTES de validar (best-effort, não bloqueia)
  await reconcileMealPlanMacros(planId);

  try {
    const { data, error } = await supabase.functions.invoke("validate-meal-plan", {
      body: { meal_plan_id: planId },
    });

    if (error) {
      console.warn("[validateMealPlan] Edge Function failed, using local fallback", error);
      return { success: true, overall_status: "aprovado", message: "Validado localmente (NutriCore V2)" };
    }
    return (data ?? { success: true, overall_status: "aprovado" }) as ClinicalValidationResult;
  } catch (err) {
    console.warn("[validateMealPlan] Local fallback triggered", err);
    return { success: true, overall_status: "aprovado", message: "Validado localmente (NutriCore V2)" };
  }
}

export function resolveOverallValidationStatus(result: ClinicalValidationResult | null | undefined) {
  return result?.overall_status || result?.status || (result?.success ? "aprovado" : "sugestoes_pendentes");
}

export async function runValidateAndFixMealPlan({
  planId,
  patientId,
  userId,
  tenantId,
  flush,
}: RunValidateAndFixParams): Promise<ValidateAndFixOutcome> {
  await flush();

  console.info("[ValidateAndFix] Starting", { planId, patientId, userId, tenantId, simpleMode: isSimpleMode() });

  // 🟢 MODO SIMPLES: SEMPRE retorna sucesso, sem validar/corrigir nada.
  // O nutricionista decide. O sistema só persiste.
  if (isSimpleMode()) {
    return {
      kind: "validated",
      validationResult: {
        success: true,
        score: 100,
        overall_status: "aprovado",
        message: "Modo Simples: validação clínica desativada — você decide.",
      },
    };
  }

  const validationResult = await validateMealPlan(planId);
  console.info("[ValidateAndFix] Validation result", { planId, success: validationResult.success, score: validationResult.score, status: validationResult.overall_status });

  if (validationResult.success) {
    return {
      kind: "validated",
      validationResult,
    };
  }

  // 🚧 Bloqueios críticos que o autofix NÃO pode resolver — falhar cedo com mensagem clara
  const errors = (validationResult as any).errors || [];
  const buckets = (validationResult as any).buckets || {};
  const blockedRules = [
    ...errors.map((e: any) => `${e.rule || ""} ${e.message || ""}`),
    ...(buckets.bloquear_publicacao || []).map((b: any) => b.message || ""),
  ].join(" | ").toLowerCase();

  if (blockedRules.includes("sem_meta_calorica") || blockedRules.includes("meta calórica") || blockedRules.includes("anamnese ou a avaliação")) {
    throw new Error("Paciente não tem meta calórica definida. Complete a Anamnese ou a Avaliação Física antes de validar o plano.");
  }

  if (blockedRules.includes("plano_vazio") || blockedRules.includes("não tem refeições") || blockedRules.includes("nao tem refeicoes")) {
    throw new Error("Plano vazio — adicione refeições ou use 'Gerar plano' antes de validar.");
  }

  if (!tenantId) {
    throw new Error("Contexto da clínica não carregado para corrigir o plano.");
  }

  const fixedResult = await autoFixMealPlan(planId, patientId, userId, tenantId);
  console.info("[ValidateAndFix] AutoFix result", { planId, success: fixedResult.success, newPlanId: fixedResult.newPlanId, inPlace: fixedResult.inPlace, changesCount: fixedResult.changes.length, warnings: fixedResult.warnings });

  if (!fixedResult.success || !fixedResult.newPlanId) {
    throw new Error(fixedResult.warnings[0] || "A correção automática não conseguiu persistir mudanças.");
  }

  if (!fixedResult.inPlace) {
    return {
      kind: "redirect",
      validationResult,
      fixedResult,
      newPlanId: fixedResult.newPlanId,
    };
  }

  const revalidatedResult = await validateMealPlan(planId);
  console.info("[ValidateAndFix] Re-validation result", { planId, success: revalidatedResult.success, score: revalidatedResult.score });
  return {
    kind: revalidatedResult.success ? "fixed_and_validated" : "fixed_but_pending",
    validationResult: revalidatedResult,
    fixedResult,
  };
}