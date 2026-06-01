/**
 * DETERMINISM TESTS — FitJourney 2.0
 * 
 * Validates that the clinical engine (Mifflin-St Jeor) produces
 * identical results for identical inputs across multiple executions.
 * 
 * CRITICAL: These tests ensure the motor clínico is deterministic
 * and not subject to floating-point errors or random variations.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  calculateTMB,
  calculateTDEE,
  calculateTargetKcal,
  calculateMacros,
  ACTIVITY_MULTIPLIERS,
  GOAL_KCAL_ADJUSTMENT,
  CLINICAL_PROTEIN_RANGES,
  CLINICAL_FAT_RANGE,
  normalizeWeightKg,
  normalizeHeightCm,
  normalizeAge,
  normalizeGoal,
  normalizeActivityLevel,
} from '../lib/clinical-macro-engine';

describe('Motor Clínico — Determinismo', () => {
  describe('calculateTMB — Mifflin-St Jeor', () => {
    it('deve retornar TMB idêntico para mesma entrada (100x)', () => {
      const weight = 70;
      const height = 170;
      const age = 30;
      const sex = 'male';

      const results = Array(100)
        .fill(null)
        .map(() => calculateTMB(weight, height, age, sex));

      // Todos os resultados devem ser idênticos
      const firstResult = results[0];
      results.forEach((result, index) => {
        expect(result).toBe(firstResult, `Execução ${index + 1} diferiu do resultado esperado`);
      });

      // Validar valor esperado (Mifflin-St Jeor para homem 70kg, 170cm, 30 anos)
      // TMB = 10*70 + 6.25*170 - 5*30 + 5 = 700 + 1062.5 - 150 + 5 = 1617.5 ≈ 1618
      expect(firstResult).toBe(1618);
    });

    it('deve retornar TMB idêntico para mulher (100x)', () => {
      const weight = 65;
      const height = 165;
      const age = 28;
      const sex = 'female';

      const results = Array(100)
        .fill(null)
        .map(() => calculateTMB(weight, height, age, sex));

      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toBe(firstResult);
      });

      // TMB = 10*65 + 6.25*165 - 5*28 - 161 = 650 + 1031.25 - 140 - 161 = 1380.25 ≈ 1380
      expect(firstResult).toBe(1380);
    });

    it('deve ser determinístico com valores extremos', () => {
      const testCases = [
        { weight: 30, height: 50, age: 1, sex: 'male' },
        { weight: 150, height: 220, age: 80, sex: 'female' },
        { weight: 100, height: 180, age: 50, sex: 'male' },
      ];

      testCases.forEach(({ weight, height, age, sex }) => {
        const results = Array(10)
          .fill(null)
          .map(() => calculateTMB(weight, height, age, sex));

        const firstResult = results[0];
        results.forEach((result) => {
          expect(result).toBe(firstResult);
        });
      });
    });
  });

  describe('calculateTDEE — Determinismo', () => {
    it('deve retornar TDEE idêntico para mesma entrada (100x)', () => {
      const tmb = 1618;
      const activityLevel = 'moderate';

      const results = Array(100)
        .fill(null)
        .map(() => calculateTDEE(tmb, activityLevel));

      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toBe(firstResult);
      });

      // TDEE = 1618 * 1.55 = 2507.9 ≈ 2508
      expect(firstResult).toBe(2508);
    });

    it('deve ser determinístico com todos os níveis de atividade', () => {
      const tmb = 1500;
      const activityLevels = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

      activityLevels.forEach((level) => {
        const results = Array(10)
          .fill(null)
          .map(() => calculateTDEE(tmb, level));

        const firstResult = results[0];
        results.forEach((result) => {
          expect(result).toBe(firstResult);
        });
      });
    });
  });

  describe('calculateTargetKcal — Determinismo', () => {
    it('deve retornar target kcal idêntico para mesma entrada (100x)', () => {
      const tdee = 2508;
      const goal = 'lose_weight';
      const sex = 'male';

      const results = Array(100)
        .fill(null)
        .map(() => calculateTargetKcal(tdee, goal, sex));

      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toBe(firstResult);
      });

      // Target = 2508 - 500 = 2008
      expect(firstResult).toBe(2008);
    });

    it('deve respeitar mínimo de 1200 kcal para mulheres', () => {
      const tdee = 1000;
      const goal = 'lose_weight';
      const sex = 'female';

      const results = Array(10)
        .fill(null)
        .map(() => calculateTargetKcal(tdee, goal, sex));

      results.forEach((result) => {
        expect(result).toBeGreaterThanOrEqual(1200);
      });
    });

    it('deve respeitar mínimo de 1500 kcal para homens', () => {
      const tdee = 1200;
      const goal = 'lose_weight';
      const sex = 'male';

      const results = Array(10)
        .fill(null)
        .map(() => calculateTargetKcal(tdee, goal, sex));

      results.forEach((result) => {
        expect(result).toBeGreaterThanOrEqual(1500);
      });
    });

    it('deve respeitar máximo de 3500 kcal', () => {
      const tdee = 5000;
      const goal = 'gain_weight';
      const sex = 'male';

      const results = Array(10)
        .fill(null)
        .map(() => calculateTargetKcal(tdee, goal, sex));

      results.forEach((result) => {
        expect(result).toBeLessThanOrEqual(3500);
      });
    });
  });

  describe('calculateMacros — Determinismo', () => {
    it('deve retornar macros idênticos para mesma entrada (100x)', () => {
      const kcal = 2000;
      const goal = 'lose_weight';
      const weight = 70;

      const results = Array(100)
        .fill(null)
        .map(() => calculateMacros(kcal, goal, weight));

      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toEqual(firstResult);
      });

      // Validar estrutura
      expect(firstResult).toHaveProperty('protein');
      expect(firstResult).toHaveProperty('carbs');
      expect(firstResult).toHaveProperty('fat');
    });

    it('deve manter macros dentro de ranges clínicos', () => {
      const testCases = [
        { kcal: 1500, goal: 'lose_weight', weight: 60 },
        { kcal: 2000, goal: 'maintain', weight: 70 },
        { kcal: 2500, goal: 'gain_muscle', weight: 80 },
      ];

      testCases.forEach(({ kcal, goal, weight }) => {
        const macros = calculateMacros(kcal, goal, weight);
        const proteinRange = CLINICAL_PROTEIN_RANGES[goal];

        // Validar proteína
        const proteinPerKg = macros.protein / weight;
        expect(proteinPerKg).toBeGreaterThanOrEqual(proteinRange.min - 0.1);
        expect(proteinPerKg).toBeLessThanOrEqual(proteinRange.max + 0.1);

        // Validar gordura
        const fatPerKg = macros.fat / weight;
        expect(fatPerKg).toBeGreaterThanOrEqual(CLINICAL_FAT_RANGE.min - 0.1);
        expect(fatPerKg).toBeLessThanOrEqual(CLINICAL_FAT_RANGE.max + 0.2);

        // Validar calorias (tolerância ±5%)
        const calculatedKcal = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
        const tolerance = kcal * 0.05;
        expect(Math.abs(calculatedKcal - kcal)).toBeLessThanOrEqual(tolerance);
      });
    });

    it('deve ser determinístico com todos os objetivos', () => {
      const goals = ['lose_weight', 'maintain', 'gain_muscle', 'gain_weight', 'improve_health'];
      const kcal = 2000;
      const weight = 70;

      goals.forEach((goal) => {
        const results = Array(10)
          .fill(null)
          .map(() => calculateMacros(kcal, goal, weight));

        const firstResult = results[0];
        results.forEach((result) => {
          expect(result).toEqual(firstResult);
        });
      });
    });
  });

  describe('Fluxo Completo — Determinismo End-to-End', () => {
    it('deve gerar mesmos macros para mesmo perfil (100x)', () => {
      const profile = {
        weight: 70,
        height: 170,
        age: 30,
        sex: 'male',
        activityLevel: 'moderate',
        goal: 'lose_weight',
      };

      const results = Array(100)
        .fill(null)
        .map(() => {
          const tmb = calculateTMB(profile.weight, profile.height, profile.age, profile.sex);
          const tdee = calculateTDEE(tmb, profile.activityLevel);
          const targetKcal = calculateTargetKcal(tdee, profile.goal, profile.sex);
          const macros = calculateMacros(targetKcal, profile.goal, profile.weight);
          return { targetKcal, macros };
        });

      const firstResult = results[0];
      results.forEach((result, index) => {
        expect(result).toEqual(firstResult, `Execução ${index + 1} diferiu`);
      });
    });

    it('deve ser determinístico com normalização de entrada', () => {
      const inputs = [
        { weight: '70', height: '170', age: '30', activityLevel: 'moderate', goal: 'lose_weight' },
        { weight: 70.5, height: 170.2, age: 30.7, activityLevel: 'MODERATE', goal: 'Perder Peso' },
        { weight: '70,5', height: '170,2', age: '30', activityLevel: 'Moderado', goal: 'emagrecer' },
      ];

      inputs.forEach((input) => {
        const results = Array(5)
          .fill(null)
          .map(() => {
            const weight = normalizeWeightKg(input.weight) || 70;
            const height = normalizeHeightCm(input.height) || 170;
            const age = normalizeAge(input.age);
            const activityLevel = normalizeActivityLevel(input.activityLevel);
            const goal = normalizeGoal(input.goal) || 'maintain';

            const tmb = calculateTMB(weight, height, age, 'male');
            const tdee = calculateTDEE(tmb, activityLevel);
            const targetKcal = calculateTargetKcal(tdee, goal, 'male');
            const macros = calculateMacros(targetKcal, goal, weight);
            return { targetKcal, macros };
          });

        const firstResult = results[0];
        results.forEach((result) => {
          expect(result).toEqual(firstResult);
        });
      });
    });
  });

  describe('Validação de Ranges Clínicos', () => {
    it('deve rejeitar peso inválido (< 30kg ou > 500kg)', () => {
      const invalidWeights = [0, 10, 25, 501, 1000];

      invalidWeights.forEach((weight) => {
        const normalized = normalizeWeightKg(weight);
        if (weight < 30 || weight > 500) {
          expect(normalized).toBeNull();
        }
      });
    });

    it('deve rejeitar altura inválida (< 50cm ou > 250cm)', () => {
      const invalidHeights = [0, 30, 49, 251, 500];

      invalidHeights.forEach((height) => {
        const normalized = normalizeHeightCm(height);
        if (height < 50 || height > 250) {
          expect(normalized).toBeNull();
        }
      });
    });

    it('deve rejeitar idade inválida (< 1 ou > 150)', () => {
      const invalidAges = [0, -5, 151, 200];
      const fallback = 30;

      invalidAges.forEach((age) => {
        const normalized = normalizeAge(age, fallback);
        expect(normalized).toBe(fallback);
      });
    });

    it('deve aceitar valores válidos', () => {
      expect(normalizeWeightKg(70)).toBe(70);
      expect(normalizeHeightCm(170)).toBe(170);
      expect(normalizeAge(30)).toBe(30);
    });
  });

  describe('Normalização de Entrada', () => {
    it('deve normalizar peso com vírgula', () => {
      expect(normalizeWeightKg('70,5')).toBe(70.5);
      expect(normalizeWeightKg('70.5')).toBe(70.5);
    });

    it('deve normalizar altura em metros', () => {
      expect(normalizeHeightCm(1.70)).toBe(170);
      expect(normalizeHeightCm('1.70')).toBe(170);
    });

    it('deve normalizar objetivo em português', () => {
      expect(normalizeGoal('perder peso')).toBe('lose_weight');
      expect(normalizeGoal('emagrecer')).toBe('lose_weight');
      expect(normalizeGoal('ganhar massa')).toBe('gain_weight');
      expect(normalizeGoal('manter peso')).toBe('maintain');
    });

    it('deve normalizar nível de atividade', () => {
      expect(normalizeActivityLevel('sedentário')).toBe('sedentary');
      expect(normalizeActivityLevel('MODERADO')).toBe('moderate');
      expect(normalizeActivityLevel('muito ativo')).toBe('very_active');
    });
  });

  describe('Contrato de Determinismo', () => {
    it('deve garantir que mesma entrada = mesma saída (contrato)', () => {
      const profile = {
        weight: 75,
        height: 175,
        age: 35,
        sex: 'male',
        activityLevel: 'active',
        goal: 'gain_muscle',
      };

      // Executar 1000x para garantir determinismo absoluto
      const results = Array(1000)
        .fill(null)
        .map(() => {
          const tmb = calculateTMB(profile.weight, profile.height, profile.age, profile.sex);
          const tdee = calculateTDEE(tmb, profile.activityLevel);
          const targetKcal = calculateTargetKcal(tdee, profile.goal, profile.sex);
          const macros = calculateMacros(targetKcal, profile.goal, profile.weight);
          return JSON.stringify({ targetKcal, macros });
        });

      // Todos os resultados devem ser idênticos
      const firstResult = results[0];
      const allIdentical = results.every((result) => result === firstResult);
      expect(allIdentical).toBe(true);
    });

    it('deve não ter variação de ponto flutuante', () => {
      const profile = {
        weight: 70.123,
        height: 170.456,
        age: 30,
        sex: 'male',
        activityLevel: 'moderate',
        goal: 'lose_weight',
      };

      const results = Array(100)
        .fill(null)
        .map(() => {
          const tmb = calculateTMB(profile.weight, profile.height, profile.age, profile.sex);
          const tdee = calculateTDEE(tmb, profile.activityLevel);
          const targetKcal = calculateTargetKcal(tdee, profile.goal, profile.sex);
          return targetKcal;
        });

      // Todos os valores devem ser idênticos (sem variação de ponto flutuante)
      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toBe(firstResult);
      });
    });
  });
});
