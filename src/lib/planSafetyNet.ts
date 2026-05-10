import { Meal, PatientContext } from "@/features/editor-v3/types";

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PlanValidationData {
  meals: Meal[];
  patientContext: PatientContext | null;
  totalMacros: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  isWeeklyMode?: boolean;
}

/**
 * 🛡️ Safety Net - Sistema de Verificação de Planos
 * ----------------------------------------------------------------
 * Executa verificações críticas antes da publicação do plano.
 * Impede a publicação se houver erros impeditivos (errors).
 * Alerta o nutricionista se houver inconsistências (warnings).
 */
export function validatePlanBeforePublish(data: PlanValidationData): PlanValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. PESO REAL APLICADO
  // Se weight === 70 -> ALERTA (O nutri pode confirmar e prosseguir)
  const weight = data.patientContext?.weight;
  if (weight === 70) {
    warnings.push("⚠️ Peso parece ser valor padrão (70kg). Verifique os dados do paciente.");
  }

  // 2. CALORIAS > 0
  if (data.totalMacros.kcal <= 0) {
    errors.push("❌ Plano está com 0 calorias. O motor não calculou corretamente.");
  }

  // 3. PROTEÍNA > 0
  if (data.totalMacros.protein <= 0) {
    errors.push("❌ Plano está sem proteína. Verifique a geração.");
  }

  // 4. CALORIAS NÃO ABSURDAS
  // Se total_kcal > 3500 (para emagrecimento) -> ALERTAR
  const goal = data.patientContext?.goal?.toLowerCase() || "";
  const isWeightLoss = goal.includes('emagrecer') || goal.includes('perda') || goal.includes('weight loss') || goal.includes('cut');
  
  if (data.totalMacros.kcal > 3500 && isWeightLoss) {
    warnings.push("⚠️ Plano com calorias muito altas para o objetivo de emagrecimento. Verifique.");
  }

  // 5. CALORIAS DIÁRIAS (NÃO TOTAIS)
  // Se modo semanal e valor parece ser o total de 7 dias -> BLOQUEAR
  // Um plano diário raramente passa de 6000-7000 kcal.
  if (data.isWeeklyMode && data.totalMacros.kcal > 7000) {
    errors.push("⚠️ Valores parecem ser o total semanal, não diário.");
  }

  // 6. CAFÉ DA MANHÃ PREENCHIDO
  const breakfast = data.meals.find(m => {
    const name = m.name.toLowerCase();
    return name.includes('café') || name.includes('cafe') || name.includes('breakfast');
  });
  
  if (!breakfast || breakfast.items.length === 0) {
    errors.push("❌ Café da manhã está vazio.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
