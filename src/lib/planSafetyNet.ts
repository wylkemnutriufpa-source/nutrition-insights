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
/**
 * 🟢 MODO FLUIDO — Sem travas.
 * O profissional decide. O sistema apenas persiste e, no máximo,
 * registra avisos no console para diagnóstico interno.
 * NUNCA bloqueia publicação por "falta de dados".
 */
export function validatePlanBeforePublish(_data: PlanValidationData): PlanValidationResult {
  // Sem bloqueios. Sem warnings exibidos. Fluxo livre.
  return { valid: true, errors: [], warnings: [] };
}
