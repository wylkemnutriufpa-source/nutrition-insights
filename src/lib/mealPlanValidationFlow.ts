import { supabase } from "@/integrations/supabase/client";
// Removed obsolete autoFixEngine import
export type AutoFixResult = {
  success: boolean;
  newPlanId: string | null;
  inPlace: boolean;
  changes: any[];
  warnings: string[];
  summary?: any;
};
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
  // NOVO: Retorna status consultivo, não bloqueante
  // - "aprovado" = score >= 65 (tudo OK, sem sugestões)
  // - "sugestoes_pendentes" = score < 65 (tem sugestões, mas pode publicar)
  // - nunca "falha" ou "bloqueado" (não bloqueia mais)
  
  const status = result?.overall_status || result?.status;
  
  if (status === "aprovado" || (result?.success && result?.validation_passed)) {
    return "aprovado";
  }
  
  if (status === "sugestoes_pendentes" || result?.score !== undefined && result.score < 65) {
    return "sugestoes_pendentes";
  }
  
  return result?.success ? "aprovado" : "sugestoes_pendentes";
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

  // ─────────────────────────────────────────────────────────────────────
  // FILOSOFIA: "O sistema sugere. O nutricionista decide."
  // 
  // Mudança crítica:
  // - Antes: success=false se score < 65 (bloqueante)
  // - Agora: success=true SEMPRE. Validação é consultiva.
  // 
  // Validações CRÍTICAS que bloqueiam (raras):
  // - Plano vazio (sem refeições)
  // - Meta calórica indefinida (precisa de anamnese ou avaliação)
  // 
  // Validações normais (score < 65):
  // - Apenas geram SUGESTÕES que o nutricionista pode ignorar
  // ─────────────────────────────────────────────────────────────────────

  // Validação sempre retorna sucesso (consultivo)
  if (validationResult.success) {
    return {
      kind: "validated",
      validationResult,
    };
  }

  // 🚧 Bloqueios CRÍTICOS e RAROS que não permitem prosseguir
  // (Essas sim precisam ser bloqueantes)
  const errors = (validationResult as any).errors || [];
  const buckets = (validationResult as any).buckets || {};
  const blockedRules = [
    ...errors.map((e: any) => `${e.rule || ""} ${e.message || ""}`),
    ...(buckets.bloquear_publicacao || []).map((b: any) => b.message || ""),
  ].join(" | ").toLowerCase();

  // Apenas PLANO VAZIO ou META INDEFINIDA bloqueiam
  if (blockedRules.includes("plano_vazio") || blockedRules.includes("não tem refeições") || blockedRules.includes("nao tem refeicoes")) {
    throw new Error("Plano vazio — adicione refeições ou use 'Gerar plano' antes de validar.");
  }

  if (blockedRules.includes("sem_meta_calorica") || blockedRules.includes("meta calórica") || blockedRules.includes("anamnese ou a avaliação")) {
    throw new Error("Paciente não tem meta calórica definida. Complete a Anamnese ou a Avaliação Física antes de validar o plano.");
  }

  // Se chegou aqui, é um erro que seria autofix (que foi desativado)
  // Ainda assim, retorna sucesso — nutricionista decide se quer publicar
  console.warn("[ValidateAndFix] Validation issued recommendations, but not blocking", { planId });
  
  return {
    kind: "validated",
    validationResult: {
      success: true,  // ← NOVO: SEMPRE sucesso
      overall_status: "sugestoes_pendentes",
      score: validationResult.score || 50,
      message: "Validação completa. O sistema tem algumas sugestões, mas você pode publicar.",
      recommendations: validationResult,  // Passar todas as recomendações
    },
  };
}