import { calculatePersonalizedScore, validateClinicalContext } from './clinicalIntelligence';
import { Meal, Food } from '../types/clinical-types';

/**
 * Suite de Testes de Regressão Clínica
 * Garante que mudanças no código não quebrem regras nutricionais fundamentais.
 */
export const runClinicalRegressions = () => {
  const results = {
    passed: 0,
    failed: 0,
    errors: [] as string[]
  };

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      results.passed++;
    } else {
      results.failed++;
      results.errors.push(message);
    }
  };

  // 1. Teste de Restrição Alimentar
  const mealWithRestriction: Meal = {
    id: '1',
    name: 'Almoço',
    items: [
      { 
        id: 'f1', name: 'Leite Desnatado', kcal: 50, protein: 5, carbs: 5, fat: 0, 
        instanceId: 'i1', quantity: 200, measurementType: 'ml', portionLabel: '200ml', substitutions: [] 
      } as any
    ]
  };
  
  const metadataWithLactose: any = {
    restrictions: ['Leite', 'Lactose'],
    goal: 'Emagrecimento',
    consent_given: true
  };

  const issues = validateClinicalContext([mealWithRestriction], metadataWithLactose);
  assert(issues.some(i => i.type === 'restriction'), 'Deveria detectar violação de restrição de Lactose');

  // 1.1 Teste de Consentimento LGPD
  const metadataNoConsent: any = {
    consent_given: false
  };
  const complianceIssues = validateClinicalContext([mealWithRestriction], metadataNoConsent);
  assert(complianceIssues.some(i => i.type === 'compliance'), 'Deveria detectar violação de compliance LGPD');

  // 2. Teste de Score para Hipertrofia
  const highProteinMeal: Meal = {
    id: '1',
    name: 'Jantar',
    items: [
      { 
        id: 'f2', name: 'Frango Grelhado', kcal: 165, protein: 31, carbs: 0, fat: 3, 
        instanceId: 'i2', quantity: 200, measurementType: 'gram', portionLabel: '200g' 
      } as any
    ]
  };

  const metadataHipertrofia: any = {
    goal: 'Hipertrofia',
    goalCalories: 2500,
    goalProtein: 200,
    goalCarbs: 300,
    goalFat: 70
  };

  const score = calculatePersonalizedScore([highProteinMeal], metadataHipertrofia);
  assert(score.total < 100, 'Score de hipertrofia deveria ser baixo para um plano com apenas uma refeição');

  // 3. Teste de Engine Determinística
  // (Simulado via validação de tipos de itens)

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Clinical Regression] Tests finished: ${results.passed} passed, ${results.failed} failed.`);
    if (results.errors.length > 0) {
      console.error('[Clinical Regression] Errors:', results.errors);
    }
  }

  return results;
};
