import { describe, it, expect } from 'vitest';
import { getSubstitutions } from '../nutricore_v2/substitutions';
import { BASE_FOODS } from '../nutricore_v2/food-database';
import { convertGramsToHousehold } from '../nutricore_v2/unit-converter';
import { formatDisplayPortion, resolveDisplayGrams } from '../nutricore_v2/portion-display';

describe('NutriCore V3 — Substituições e Medidas Caseiras', () => {
  const bread = BASE_FOODS.find(f => f.id === '23')!; // Pão Integral, carb_100g: 48, kcal_100g: 260
  const tapioca = BASE_FOODS.find(f => f.id === '19')!; // Tapioca, carb_100g: 54, kcal_100g: 220

  it('deve retornar substituições válidas para Pão Integral (2 fatias = 50g)', () => {
    const currentGrams = 50;
    const subs = getSubstitutions(bread, BASE_FOODS, currentGrams);
    
    expect(subs.length).toBeGreaterThan(0);
    
    const tapiocaSub = subs.find(s => s.food.id === '19');
    expect(tapiocaSub).toBeDefined();
    
    // Pão (50g) tem 24g carb (48 * 0.5)
    // Tapioca tem 54g carb/100g. 
    // g = 24 / 0.54 = 44.4g -> arredonda para 45g
    expect(tapiocaSub?.grams).toBe(45);
    expect(tapiocaSub?.unit_label).toBe('45g');
  });

  it('deve converter gramas para medida caseira corretamente', () => {
    // 50g de pão integral -> 2 fatias
    const breadResult = convertGramsToHousehold('Pão Integral', 50);
    expect(breadResult.quantity).toBe(2);
    expect(breadResult.portionLabel).toBe('fatia(s)');
    expect(breadResult.measurementType).toBe('unit');

    // 100g de ovo -> 2 unidades
    const eggResult = convertGramsToHousehold('Ovo Cozido', 100);
    expect(eggResult.quantity).toBe(2);
    expect(eggResult.portionLabel).toBe('unidade(s)');

    // 100g de arroz -> 4 colheres
    const riceResult = convertGramsToHousehold('Arroz Branco Cozido', 100);
    expect(riceResult.quantity).toBe(4);
    expect(riceResult.measurementType).toBe('spoon');
  });

  it('deve limpar quantidade visual corrompida no PDF sem expor 1000g ao paciente', () => {
    const bananaCorrompida = {
      name: 'Banana Prata',
      quantity: 1000,
      measurementType: 'gram',
      portionValue: 100,
      kcal: 95,
      calories: 95,
      kcal_100g: 98,
    };

    expect(resolveDisplayGrams(bananaCorrompida)).toBe(97);
    expect(formatDisplayPortion(bananaCorrompida)).toBe('1 unidade(s) M (97g)');
  });
});
