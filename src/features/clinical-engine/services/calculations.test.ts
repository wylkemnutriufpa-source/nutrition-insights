import { describe, it, expect } from 'vitest';
import { calculateFullMetrics } from './calculations';

describe('V3 Calculations Engine', () => {
  // Teste 1: Homem 80kg, 175cm, 36a, moderate, lose
  it('Homem 80kg/175cm/36a moderado emagrecer', () => {
    const metrics = calculateFullMetrics({
      weight_kg: 80,
      height_cm: 175,
      sex: 'M',
      age: 36,
      activity_level: 'moderate',
      goal: 'lose'
    });
    
    // TMB = (10 * 80) + (6.25 * 175) - (5 * 36) + 5 = 800 + 1093.75 - 180 + 5 = 1718.75
    expect(metrics.tmb).toBeCloseTo(1718.75, 0);
    // GET = 1718.75 * 1.55 = 2664.0625
    expect(metrics.get).toBeCloseTo(2664, 0);
    // Target = 2664.06 - 500 = 2164.06
    expect(metrics.target_calories).toBeCloseTo(2164, 0);
    // Proteína = 80 * 1.6 = 128
    expect(metrics.macros.proteina_g).toBeCloseTo(128, 0);
  });

  // Teste 2: Mulher 65kg, 160cm, 28a, sedentary, maintain
  it('Mulher 65kg/160cm/28a sedentária manter', () => {
    const metrics = calculateFullMetrics({
      weight_kg: 65,
      height_cm: 160,
      sex: 'F',
      age: 28,
      activity_level: 'sedentary',
      goal: 'maintain'
    });
    // Proteína = 65 * 1.8 = 117
    expect(metrics.macros.proteina_g).toBeCloseTo(117, 0);
  });

  // Teste 3: Casos de borda
  it('Erro: peso zero', () => {
    expect(() => calculateFullMetrics({
      weight_kg: 0, height_cm: 175, sex: 'M', age: 36,
      activity_level: 'moderate', goal: 'lose'
    })).toThrow('Weight must be greater than zero');
  });

  it('Erro: altura zero', () => {
    expect(() => calculateFullMetrics({
      weight_kg: 80, height_cm: 0, sex: 'M', age: 36,
      activity_level: 'moderate', goal: 'lose'
    })).toThrow('Height must be greater than zero');
  });

  it('Erro: idade negativa', () => {
    expect(() => calculateFullMetrics({
      weight_kg: 80, height_cm: 175, sex: 'M', age: -1,
      activity_level: 'moderate', goal: 'lose'
    })).toThrow('Age cannot be negative');
  });

  // Teste 4: Consistência calórica
  it('Macros somam 100% das calorias', () => {
    const metrics = calculateFullMetrics({
      weight_kg: 70, height_cm: 170, sex: 'F', age: 30,
      activity_level: 'light', goal: 'gain'
    });
    const total = metrics.macros.proteina_g * 4 
                + metrics.macros.carboidrato_g * 4 
                + metrics.macros.gordura_g * 9;
    expect(total).toBeCloseTo(metrics.target_calories, 0); // tolerância mínima
  });
});
