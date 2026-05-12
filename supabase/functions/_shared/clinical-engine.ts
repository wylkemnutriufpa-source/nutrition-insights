/**
 * Clinical Engine Unificado — FitJourney
 * @deprecated Use clinical-engine-v2.ts for sovereign reconciliation logic.
 */

import { StrategyId, getStrategy, StrategyParams } from "./strategies.ts";
import { 
  calculateTMB, 
  calculateTDEE, 
  calculateTargetKcal, 
  calculateMacros 
} from "./clinical-macro-engine.ts";

export interface ClinicalInput {
  patientId: string;
  weight: number;
  height: number;
  age: number;
  sex: string;
  goal: string;
  activityLevel: string;
  restrictions: string[];
  dislikedFoods: string[];
  strategyId?: StrategyId;
  bbPhase?: number;
}

export interface ClinicalPlan {
  engine_version: string;
  protocol_used: string;
  plan_version: string;
  metrics: {
    tmb: number;
    tdee: number;
    target_kcal: number;
    macros: {
      protein: number;
      carbs: number;
      fat: number;
    }
  };
  meals: any[];
}

export class ClinicalEngine {
  private static VERSION = "1.0.0-clinical-unified";

  /**
   * Ponto de entrada único para geração de planos
   */
  static async generateMealPlan(input: ClinicalInput, client: any): Promise<ClinicalPlan> {
    const strategyId = input.strategyId || "ifj_standard";
    const strategy = getStrategy(strategyId);

    // 1. Calcular Métricas Base
    const tmb = calculateTMB(input.weight, input.height, input.age, input.sex);
    const tdee = calculateTDEE(tmb, input.activityLevel);
    
    // Aplicar ajuste calórico da estratégia ou padrão
    const strategyParams: StrategyParams = {
      goal: input.goal,
      weight: input.weight,
      sex: input.sex,
      activityLevel: input.activityLevel,
      bbPhase: input.bbPhase
    };
    
    const calorieAdjustment = strategy.getCalorieAdjustment(strategyParams);
    const targetKcal = calorieAdjustment !== null 
      ? Math.max(1200, tdee + calorieAdjustment)
      : calculateTargetKcal(tdee, input.goal, input.sex);

    // 2. Calcular Macros
    const strategyMacros = strategy.getMacroDistribution(strategyParams);
    let macros;
    
    if (strategyMacros) {
      const proteinPerKg = strategy.getProteinPerKg(strategyParams) || 2.0;
      const protein = Math.round(input.weight * proteinPerKg);
      const fat = Math.round((targetKcal * strategyMacros.fatPct) / 9);
      const carbs = Math.round((targetKcal - (protein * 4) - (fat * 9)) / 4);
      macros = { protein, carbs, fat };
    } else {
      macros = calculateMacros(targetKcal, input.goal, input.weight);
    }

    // 3. Resolver Refeições (Delegar para o motor de templates visuais por enquanto)
    // Nota: Em Etapas posteriores, moveremos a lógica de composição de refeições para cá.
    
    return {
      engine_version: this.VERSION,
      protocol_used: strategyId,
      plan_version: "1.0.0",
      metrics: {
        tmb,
        tdee,
        target_kcal: targetKcal,
        macros
      },
      meals: [] // Preenchido pelo orquestrador
    };
  }
}
