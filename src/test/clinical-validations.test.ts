/**
 * CLINICAL VALIDATIONS TESTS — FitJourney 2.0
 * 
 * Tests for clinical data validation schemas and ranges.
 * Ensures all inputs conform to clinical constraints.
 */

import { describe, it, expect } from 'vitest';
import {
  validateMetabolicProfile,
  validateMacros,
  validateFoodItem,
  validateMealPlanItem,
  validateMealPlan,
  validateSubstitutionCompatibility,
  calculateBMI,
  validateBMI,
  validateClinicalInput,
  CLINICAL_RANGES,
  metabolicProfileSchema,
  macrosSchema,
} from '../lib/clinical-validations';

describe('Clinical Validations', () => {
  describe('Metabolic Profile Validation', () => {
    it('deve aceitar perfil válido', () => {
      const profile = {
        weight: 70,
        height: 170,
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'lose_weight',
      };

      const result = validateMetabolicProfile(profile);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('deve rejeitar peso inválido (< 30kg)', () => {
      const profile = {
        weight: 20,
        height: 170,
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'lose_weight',
      };

      const result = validateMetabolicProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain('30kg');
    });

    it('deve rejeitar peso inválido (> 500kg)', () => {
      const profile = {
        weight: 600,
        height: 170,
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'lose_weight',
      };

      const result = validateMetabolicProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('deve rejeitar altura inválida (< 50cm)', () => {
      const profile = {
        weight: 70,
        height: 40,
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'lose_weight',
      };

      const result = validateMetabolicProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('deve rejeitar altura inválida (> 250cm)', () => {
      const profile = {
        weight: 70,
        height: 300,
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'lose_weight',
      };

      const result = validateMetabolicProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('deve rejeitar idade inválida (< 1)', () => {
      const profile = {
        weight: 70,
        height: 170,
        age: 0,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'lose_weight',
      };

      const result = validateMetabolicProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('deve rejeitar idade inválida (> 150)', () => {
      const profile = {
        weight: 70,
        height: 170,
        age: 200,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'lose_weight',
      };

      const result = validateMetabolicProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('deve rejeitar gênero inválido', () => {
      const profile = {
        weight: 70,
        height: 170,
        age: 30,
        gender: 'other',
        activityLevel: 'moderate',
        goal: 'lose_weight',
      };

      const result = validateMetabolicProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('deve rejeitar nível de atividade inválido', () => {
      const profile = {
        weight: 70,
        height: 170,
        age: 30,
        gender: 'male',
        activityLevel: 'extreme',
        goal: 'lose_weight',
      };

      const result = validateMetabolicProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('deve rejeitar objetivo inválido', () => {
      const profile = {
        weight: 70,
        height: 170,
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'unknown',
      };

      const result = validateMetabolicProfile(profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Macros Validation', () => {
    it('deve aceitar macros válidos', () => {
      const macros = {
        kcal: 2000,
        protein_g: 150,
        carbs_g: 200,
        fat_g: 67,
      };

      const result = validateMacros(macros);
      expect(result.valid).toBe(true);
    });

    it('deve rejeitar kcal inválido (< 800)', () => {
      const macros = {
        kcal: 500,
        protein_g: 50,
        carbs_g: 50,
        fat_g: 20,
      };

      const result = validateMacros(macros);
      expect(result.valid).toBe(false);
    });

    it('deve rejeitar kcal inválido (> 5000)', () => {
      const macros = {
        kcal: 6000,
        protein_g: 300,
        carbs_g: 500,
        fat_g: 200,
      };

      const result = validateMacros(macros);
      expect(result.valid).toBe(false);
    });

    it('deve rejeitar proteína inválida (> 500g)', () => {
      const macros = {
        kcal: 2000,
        protein_g: 600,
        carbs_g: 200,
        fat_g: 67,
      };

      const result = validateMacros(macros);
      expect(result.valid).toBe(false);
    });

    it('deve rejeitar carboidratos inválidos (> 500g)', () => {
      const macros = {
        kcal: 2000,
        protein_g: 150,
        carbs_g: 600,
        fat_g: 67,
      };

      const result = validateMacros(macros);
      expect(result.valid).toBe(false);
    });

    it('deve rejeitar gordura inválida (> 200g)', () => {
      const macros = {
        kcal: 2000,
        protein_g: 150,
        carbs_g: 200,
        fat_g: 300,
      };

      const result = validateMacros(macros);
      expect(result.valid).toBe(false);
    });

    it('deve rejeitar macros que não correspondem às calorias', () => {
      const macros = {
        kcal: 2000,
        protein_g: 50, // 200 kcal
        carbs_g: 50, // 200 kcal
        fat_g: 50, // 450 kcal
        // Total: 850 kcal (muito diferente de 2000)
      };

      const result = validateMacros(macros);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('Macros não correspondem');
    });

    it('deve aceitar macros com tolerância de ±5%', () => {
      const macros = {
        kcal: 2000,
        protein_g: 150, // 600 kcal
        carbs_g: 200, // 800 kcal
        fat_g: 67, // 603 kcal
        // Total: 2003 kcal (dentro de ±5% de 2000)
      };

      const result = validateMacros(macros);
      expect(result.valid).toBe(true);
    });
  });

  describe('Food Item Validation', () => {
    it('deve aceitar item de alimento válido', () => {
      const item = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Frango grelhado',
        kcal: 165,
        protein_g: 31,
        carbs_g: 0,
        fat_g: 3.6,
        quantity_display: '100g',
      };

      const result = validateFoodItem(item);
      expect(result.valid).toBe(true);
    });

    it('deve rejeitar item sem ID', () => {
      const item = {
        name: 'Frango grelhado',
        kcal: 165,
        protein_g: 31,
        carbs_g: 0,
        fat_g: 3.6,
        quantity_display: '100g',
      };

      const result = validateFoodItem(item);
      expect(result.valid).toBe(false);
    });

    it('deve rejeitar item sem quantity_display', () => {
      const item = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Frango grelhado',
        kcal: 165,
        protein_g: 31,
        carbs_g: 0,
        fat_g: 3.6,
      };

      const result = validateFoodItem(item);
      expect(result.valid).toBe(false);
    });
  });

  describe('Meal Plan Item Validation', () => {
    it('deve aceitar item de plano válido', () => {
      const item = {
        meal_plan_id: '550e8400-e29b-41d4-a716-446655440000',
        day_of_week: 'monday',
        tipo_refeicao: 'Café da Manhã',
        title: 'Frango grelhado',
        meta_calorias: 165,
        meta_proteinas: 31,
        meta_carboidratos: 0,
        meta_gorduras: 3.6,
        quantity_display: '100g',
      };

      const result = validateMealPlanItem(item);
      expect(result.valid).toBe(true);
    });

    it('deve rejeitar dia da semana inválido', () => {
      const item = {
        meal_plan_id: '550e8400-e29b-41d4-a716-446655440000',
        day_of_week: 'invalid',
        tipo_refeicao: 'Café da Manhã',
        title: 'Frango grelhado',
        meta_calorias: 165,
        meta_proteinas: 31,
        meta_carboidratos: 0,
        meta_gorduras: 3.6,
        quantity_display: '100g',
      };

      const result = validateMealPlanItem(item);
      expect(result.valid).toBe(false);
    });
  });

  describe('Meal Plan Validation', () => {
    it('deve aceitar plano válido', () => {
      const plan = {
        patient_id: '550e8400-e29b-41d4-a716-446655440000',
        nutritionist_id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Plano de Emagrecimento',
        description: 'Plano para perder peso',
        total_calories: 2000,
        total_protein: 150,
        total_carbs: 200,
        total_fat: 67,
        start_date: new Date().toISOString(),
        is_active: true,
      };

      const result = validateMealPlan(plan);
      expect(result.valid).toBe(true);
    });

    it('deve rejeitar calorias inválidas', () => {
      const plan = {
        patient_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Plano de Emagrecimento',
        total_calories: 500, // < 800
        total_protein: 50,
        total_carbs: 50,
        total_fat: 20,
        start_date: new Date().toISOString(),
        is_active: true,
      };

      const result = validateMealPlan(plan);
      expect(result.valid).toBe(false);
    });
  });

  describe('Substitution Compatibility', () => {
    it('deve aceitar substituição compatível', () => {
      const original = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Frango grelhado',
        kcal: 165,
        protein_g: 31,
        carbs_g: 0,
        fat_g: 3.6,
        quantity_display: '100g',
      };

      const substitute = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Peixe grelhado',
        kcal: 170, // ±3% de 165
        protein_g: 32, // ±3% de 31
        carbs_g: 0,
        fat_g: 3.5, // ±3% de 3.6
        quantity_display: '100g',
      };

      const result = validateSubstitutionCompatibility(original, substitute, 0.1);
      expect(result.compatible).toBe(true);
    });

    it('deve rejeitar substituição incompatível (calorias)', () => {
      const original = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Frango grelhado',
        kcal: 165,
        protein_g: 31,
        carbs_g: 0,
        fat_g: 3.6,
        quantity_display: '100g',
      };

      const substitute = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Arroz branco',
        kcal: 300, // 82% diferente
        protein_g: 2.7,
        carbs_g: 65,
        fat_g: 0.3,
        quantity_display: '100g',
      };

      const result = validateSubstitutionCompatibility(original, substitute, 0.1);
      expect(result.compatible).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('deve rejeitar substituição incompatível (proteína)', () => {
      const original = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Frango grelhado',
        kcal: 165,
        protein_g: 31,
        carbs_g: 0,
        fat_g: 3.6,
        quantity_display: '100g',
      };

      const substitute = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Arroz branco',
        kcal: 165,
        protein_g: 2.7, // 91% diferente
        carbs_g: 0,
        fat_g: 3.6,
        quantity_display: '100g',
      };

      const result = validateSubstitutionCompatibility(original, substitute, 0.1);
      expect(result.compatible).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('BMI Calculation and Validation', () => {
    it('deve calcular BMI corretamente', () => {
      const bmi = calculateBMI(70, 170);
      expect(bmi).toBeCloseTo(24.2, 1);
    });

    it('deve validar BMI dentro do range', () => {
      const result = validateBMI(70, 170);
      expect(result.valid).toBe(true);
      expect(result.bmi).toBeCloseTo(24.2, 1);
    });

    it('deve rejeitar BMI muito baixo', () => {
      const result = validateBMI(30, 200); // BMI ≈ 7.5
      expect(result.valid).toBe(false);
      expect(result.message).toContain('fora do range');
    });

    it('deve rejeitar BMI muito alto', () => {
      const result = validateBMI(200, 150); // BMI ≈ 89
      expect(result.valid).toBe(false);
      expect(result.message).toContain('fora do range');
    });
  });

  describe('Comprehensive Clinical Input Validation', () => {
    it('deve validar entrada clínica completa', () => {
      const input = {
        weight: 70,
        height: 170,
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'lose_weight',
      };

      const result = validateClinicalInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('deve retornar avisos para BMI fora do esperado', () => {
      const input = {
        weight: 150,
        height: 150,
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'lose_weight',
      };

      const result = validateClinicalInput(input);
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
    });

    it('deve retornar erros para entrada inválida', () => {
      const input = {
        weight: 20, // < 30
        height: 170,
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'lose_weight',
      };

      const result = validateClinicalInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Clinical Ranges Constants', () => {
    it('deve ter ranges definidos para todos os parâmetros', () => {
      expect(CLINICAL_RANGES.weight).toBeDefined();
      expect(CLINICAL_RANGES.height).toBeDefined();
      expect(CLINICAL_RANGES.age).toBeDefined();
      expect(CLINICAL_RANGES.bmi).toBeDefined();
      expect(CLINICAL_RANGES.kcal).toBeDefined();
      expect(CLINICAL_RANGES.protein).toBeDefined();
      expect(CLINICAL_RANGES.carbs).toBeDefined();
      expect(CLINICAL_RANGES.fat).toBeDefined();
    });

    it('deve ter min < max para todos os ranges', () => {
      Object.entries(CLINICAL_RANGES).forEach(([key, range]) => {
        expect(range.min).toBeLessThan(range.max, `${key}: min deve ser < max`);
      });
    });
  });
});
