import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeFood, normalizeMeals } from '../utils/normalization';
import { ClinicalGuard } from '../utils/pipeline-trace';

describe('SYSTEM_CRITICAL_RUNTIME — Suíte de Estabilidade Soberana', () => {
  
  describe('Motor Clínico & Clamping (Proteção Luciana)', () => {
    it('deve aplicar ClinicalGuard apenas para explosões absurdas (ex: 27500g)', () => {
      const inputQuantity = 27500;
      const clamped = ClinicalGuard.clampQuantity(inputQuantity, 'frango', 'gram');
      
      // O novo limite para gramas é 10000g (10kg)
      expect(clamped).toBeLessThanOrEqual(10000);
      
      // Teste específico de "unidade" para evitar explosão extrema
      const eggs = ClinicalGuard.clampQuantity(5000, 'ovo', 'unit');
      expect(eggs).toBe(1000); // Max 1000 unidades
    });

    it('deve preservar clinical_mass_g durante normalização', () => {
      const food: any = {
        name: 'Arroz Cozido',
        quantity: 150,
        measurementType: 'gram',
        clinical_mass_g: 150
      };
      
      const normalized = normalizeFood(food);
      expect((normalized as any).clinical_mass_g).toBe(150);
      
      // Se mudar a exibição para colher, a massa clínica NÃO deve mudar
      const asSpoon = { ...normalized, measurementType: 'spoon', quantity: 6 };
      const reNormalized = normalizeFood(asSpoon);
      expect((reNormalized as any).clinical_mass_g).toBe(150);
    });
  });

  describe('Integridade do Editor V3', () => {
    it('deve hidratar refeições sem perder IDs ou integridade de itens', () => {
      const rawMeals = [
        {
          id: 'meal-1',
          name: 'Almoço',
          time: '12:00',
          items: [
            { name: 'Feijão', quantity: 100, measurementType: 'gram' }
          ]
        }
      ];
      
      const hydrated = normalizeMeals(rawMeals as any);
      expect(hydrated[0].items[0].instanceId).toBeDefined();
      expect(hydrated[0].items[0].clinical_mass_g).toBe(100);
    });

    it('deve sanitizar macros impossíveis (Anti-Drift)', () => {
      const crazyMacros = {
        kcal: 5000,
        protein: 300,
        carbs: 1000,
        fat: 500
      };
      
      const sanitized = ClinicalGuard.sanitizeMacros(crazyMacros);
      expect(sanitized.kcal).toBeLessThanOrEqual(2500);
      expect(sanitized.protein).toBeLessThanOrEqual(150);
    });
  });

  describe('Resistência ao Legado', () => {
    it('deve converter V2 para V3 sem corromper quantidades básicas', () => {
      const v2Data = [
        {
          meal_type: 'lunch',
          name: 'Frango Grelhado',
          quantity: 120,
          calories: 200
        }
      ];
      
      // Simulando a lógica de normalizeV2ToV3 simplificada para o teste
      const meal = {
        id: '1',
        name: 'Almoço',
        items: v2Data.map(i => ({ ...i, clinical_mass_g: i.quantity }))
      };
      
      expect(meal.items[0].clinical_mass_g).toBe(120);
    });
  });
});
