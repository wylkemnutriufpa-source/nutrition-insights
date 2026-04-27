import { calcMetrics, type PatientInput } from "./calculations";
import { buildMealStructure, type MealStructureInput } from "./mealStructureBuilder";
import { buildDynamicDistribution } from "./distributionEngine";
import { buildDynamicPlan } from "./planBuilderDynamic";
import type { FoodRecord } from "./planBuilder";
import type { Goal } from "./constants";

/**
 * Ponto de entrada unificado para o Motor V2.1 (Dinâmico)
 * desacopla estrutura da matemática e mantém determinismo.
 */
export async function generateDynamicPlan(
  patient: PatientInput,
  mealInputs: MealStructureInput[],
  foods: FoodRecord[]
) {
  // 1. Camada Matemática (Motor V2 original)
  const metrics = calcMetrics(patient);

  // 2. Camada de Estrutura (Nova)
  const structure = buildMealStructure(mealInputs);

  // 3. Camada de Distribuição (Nova)
  const distributions = buildDynamicDistribution(structure, metrics.target_kcal);

  // 4. Camada de Construção de Plano (Nova)
  const plan = buildDynamicPlan(
    metrics,
    patient.goal as Goal,
    foods,
    structure,
    distributions
  );

  return {
    metrics,
    structure,
    distributions,
    plan
  };
}
