import { Meal, Food } from "@/stores/diet-builder/useDietStore";
import { PatientData, PlanType } from "./planGeneratorEngine";

export interface ValidationResult {
  score: number;
  errors: string[];
  isValid: boolean;
}

export function validateMealPlan(
  meals: Meal[],
  patientData: PatientData,
  planType: PlanType
): ValidationResult {
  const errors: string[] = [];
  let score = 100;

  // 1. Estrutura
  if (!meals || meals.length === 0) {
    errors.push("Plano sem refeições");
    score = 0;
  } else {
    meals.forEach(meal => {
      if (!meal.items || meal.items.length === 0) {
        errors.push(`Refeição "${meal.type}" está vazia`);
        score -= 25;
      }
    });
  }

  // 2. Nutrição
  const totalKcal = meals.reduce((sum, meal) => 
    sum + meal.items.reduce((mSum, item) => mSum + item.calories, 0), 0);
  
  const targetKcal = patientData.calories_target;
  
  if (planType === 'emagrecimento' && totalKcal > targetKcal) {
    errors.push("Calorias acima do alvo para emagrecimento");
    score -= 20;
  } else if (planType === 'hipertrofia' && totalKcal < targetKcal) {
    errors.push("Calorias abaixo do alvo para hipertrofia");
    score -= 20;
  }

  // 3. Substituições
  meals.forEach(meal => {
    meal.items.forEach(item => {
      if (!item.substitutions || item.substitutions.length === 0) {
        errors.push(`Alimento "${item.name}" na refeição "${meal.type}" não tem substituições`);
        score -= 10;
      } else {
        // Verificar equivalência nutricional básica
        item.substitutions.forEach(sub => {
          const kcalDiff = Math.abs(sub.calories - item.calories);
          if (kcalDiff > 100) {
            errors.push(`Substituição "${sub.name}" para "${item.name}" não é equivalente (>100kcal de diferença)`);
            score -= 5;
          }
        });
      }
    });
  });

  // 4. Restrições e Alergias
  const forbiddenFoods = patientData.restrictions || [];
  meals.forEach(meal => {
    meal.items.forEach(item => {
      if (forbiddenFoods.some(f => item.name.toLowerCase().includes(f.toLowerCase()))) {
        errors.push(`Alimento proibido detectado: ${item.name}`);
        score = 0; // Erro crítico
      }
    });
  });

  // 5. Coerência (Exemplo: Low Carb)
  if (planType === 'low_carb' || planType === 'cetogenico') {
    const totalCarbs = meals.reduce((sum, meal) => 
      sum + meal.items.reduce((mSum, item) => mSum + item.carbs, 0), 0);
    
    // Se carbs > 30% das kcal (estimativa simples), penalizar
    const carbKcal = totalCarbs * 4;
    if (carbKcal > totalKcal * 0.3) {
      errors.push("Nível de carboidratos muito alto para plano Low Carb/Cetogênico");
      score -= 30;
    }
  }

  // Garantir que score não seja negativo
  score = Math.max(0, score);

  const isValid = score === 100;

  console.log(`[FJ:PLAN_VALIDATION] Score: ${score} | Erros: ${errors.length} | Status: ${isValid ? 'OK' : 'Falhou'}`);
  if (errors.length > 0) {
    console.log("Erros encontrados:", errors);
  }

  return {
    score,
    errors,
    isValid
  };
}
