
import { describe, it, expect } from 'vitest';
import { distributeCalories, validateDistribution, MealSlot } from './distribution';

describe('Meal Distribution Engine V3', () => {
  const fullMeals: MealSlot[] = [
    { type: 'cafe_da_manha', time: '07:00' },
    { type: 'lanche_manha', time: '10:00' },
    { type: 'almoco', time: '13:00' },
    { type: 'lanche_tarde', time: '16:00' },
    { type: 'jantar', time: '20:00' },
    { type: 'ceia', time: '22:00' },
  ];

  it('Distribuição fixa: 2000 kcal, 6 refeições (padrão)', () => {
    const result = distributeCalories({
      target_calories: 2000,
      meals: fullMeals,
      distribution_type: 'fixed'
    });

    expect(result).toHaveLength(6);
    expect(result[0].percentage).toBe(20); // café
    expect(result[2].percentage).toBe(30); // almoço
    
    const validation = validateDistribution(result);
    expect(validation.isValid).toBe(true);
    expect(validation.totalPercentage).toBeCloseTo(100, 0);
  });

  it('Distribuição fixa: redistribuição proporcional com 3 refeições', () => {
    const reducedMeals: MealSlot[] = [
      { type: 'cafe_da_manha', time: '08:00' },
      { type: 'almoco', time: '12:00' },
      { type: 'jantar', time: '19:00' },
    ];

    const result = distributeCalories({
      target_calories: 2000,
      meals: reducedMeals,
      distribution_type: 'fixed'
    });

    // Pesos originais: 20, 30, 25. Soma = 75.
    // Café: (20/75)*100 = 26.66...
    // Almoço: (30/75)*100 = 40
    // Jantar: (25/75)*100 = 33.33...
    expect(result[1].percentage).toBe(40);
    expect(result[0].percentage).toBeCloseTo(26.67, 1);
    
    const validation = validateDistribution(result);
    expect(validation.isValid).toBe(true);
  });

  it('Distribuição dinâmica: somatório = 100%', () => {
    const result = distributeCalories({
      target_calories: 2500,
      meals: fullMeals,
      distribution_type: 'dynamic'
    });

    const validation = validateDistribution(result);
    expect(validation.isValid).toBe(true);
    expect(validation.totalPercentage).toBeCloseTo(100, 0);
    
    // Almoço e Jantar devem ter calorias iguais (peso 1.2)
    const almoco = result.find(r => r.meal_type === 'almoco');
    const jantar = result.find(r => r.meal_type === 'jantar');
    expect(almoco?.calories).toBe(jantar?.calories);
  });

  it('Customizada: nutri define 25/5/30/10/25/5', () => {
    const customWeights = {
      cafe_da_manha: 25,
      lanche_manha: 5,
      almoco: 30,
      lanche_tarde: 10,
      jantar: 25,
      ceia: 5
    };

    const result = distributeCalories({
      target_calories: 1800,
      meals: fullMeals,
      distribution_type: 'custom',
      custom_weights: customWeights
    });

    expect(result[0].percentage).toBe(25);
    expect(result[1].percentage).toBe(5);
    
    const validation = validateDistribution(result);
    expect(validation.isValid).toBe(true);
  });

  it('Horários vêm da anamnese — não são fixos', () => {
    const customTimeMeals: MealSlot[] = [
      { type: 'cafe_da_manha', time: '09:30' },
      { type: 'almoco', time: '14:15' },
    ];

    const result = distributeCalories({
      target_calories: 2000,
      meals: customTimeMeals,
      distribution_type: 'fixed'
    });

    expect(result[0].time).toBe('09:30');
    expect(result[1].time).toBe('14:15');
  });

  it('Deve falhar na validação se houver refeição com 0%', () => {
    const badDistribution = [
      { meal_type: 'cafe', time: '08:00', calories: 1000, percentage: 100 },
      { meal_type: 'lanche', time: '10:00', calories: 0, percentage: 0 },
    ];
    
    const validation = validateDistribution(badDistribution);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('All meals must have a percentage greater than 0');
  });
});
