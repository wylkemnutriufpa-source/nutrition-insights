import { describe, it, expect } from 'vitest';
import { isProtein, isCarb, isFruit, getDeterministicSuggestions, calculateItemMacros } from '../../../clinical-engine';
import { Food } from '../../../clinical-engine/types/clinical-types';

const mockAvailableFoods: Food[] = [
  { id: '1', name: 'Frango Grelhado', kcal: 160, protein: 31, carbs: 0, fat: 3.5, measurementType: 'gram', portionLabel: '100g' } as Food,
  { id: '2', name: 'Carne Vermelha', kcal: 250, protein: 26, carbs: 0, fat: 15, measurementType: 'gram', portionLabel: '100g' } as Food,
  { id: '2b', name: 'Peixe Tilápia', kcal: 120, protein: 20, carbs: 0, fat: 2, measurementType: 'gram', portionLabel: '100g' } as Food,
  { id: '2c', name: 'Ovo cozido', kcal: 70, protein: 6, carbs: 0.5, fat: 5, measurementType: 'unit', portionLabel: '1 unidade' } as Food,
  { id: '3', name: 'Arroz Branco', kcal: 130, protein: 2, carbs: 28, fat: 0.3, measurementType: 'gram', portionLabel: '100g' } as Food,
  { id: '4', name: 'Batata Doce', kcal: 86, protein: 1.6, carbs: 20, fat: 0.1, measurementType: 'gram', portionLabel: '100g' } as Food,
  { id: '4b', name: 'Macarrão Integral', kcal: 150, protein: 5, carbs: 30, fat: 1, measurementType: 'gram', portionLabel: '100g' } as Food,
  { id: '4c', name: 'Cuscuz Marroquino', kcal: 112, protein: 4, carbs: 23, fat: 0.2, measurementType: 'gram', portionLabel: '100g' } as Food,
  { id: '5', name: 'Banana', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, measurementType: 'unit', portionLabel: '1 unidade' } as Food,
  { id: '6', name: 'Maçã', kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, measurementType: 'unit', portionLabel: '1 unidade' } as Food,
  { id: '6b', name: 'Uva', kcal: 67, protein: 0.6, carbs: 17, fat: 0.4, measurementType: 'unit', portionLabel: '1 porção' } as Food,
  { id: '6c', name: 'Pêra', kcal: 57, protein: 0.4, carbs: 15, fat: 0.1, measurementType: 'unit', portionLabel: '1 unidade' } as Food,
];

describe('Motor V3 Determinístico - Categorização', () => {
  it('deve identificar proteínas corretamente', () => {
    expect(isProtein('Frango')).toBe(true);
    expect(isProtein('Patinho')).toBe(true);
    expect(isProtein('Ovo mexido')).toBe(true);
    expect(isProtein('Arroz')).toBe(false);
  });

  it('deve identificar carboidratos corretamente', () => {
    expect(isCarb('Arroz')).toBe(true);
    expect(isCarb('Batata')).toBe(true);
    expect(isCarb('Pão integral')).toBe(true);
    expect(isCarb('Frango')).toBe(false);
  });

  it('deve identificar frutas corretamente', () => {
    expect(isFruit('Banana')).toBe(true);
    expect(isFruit('Maçã')).toBe(true);
    expect(isFruit('Suco de Laranja')).toBe(true);
    expect(isFruit('Ovo')).toBe(false);
  });
});

describe('Motor V3 Determinístico - Sugestões Inteligentes', () => {
  it('deve sugerir proteínas para um item de proteína', () => {
    const suggestions = getDeterministicSuggestions('Frango Grelhado', mockAvailableFoods, 'gram', '100g');
    expect(suggestions.some(s => s.name === 'Carne Vermelha')).toBe(true);
    expect(suggestions.every(s => isProtein(s.name))).toBe(true);
  });

  it('deve sugerir carboidratos para um item de carboidrato', () => {
    const suggestions = getDeterministicSuggestions('Arroz Branco', mockAvailableFoods, 'gram', '100g');
    expect(suggestions.some(s => s.name === 'Batata Doce')).toBe(true);
    expect(suggestions.every(s => isCarb(s.name))).toBe(true);
  });

  it('deve priorizar mesma unidade de medida', () => {
    const suggestions = getDeterministicSuggestions('Banana', mockAvailableFoods, 'unit', '1 unidade');
    expect(suggestions[0].measurementType).toBe('unit');
    expect(suggestions[0].name).toBe('Maçã');
  });

  it('deve ser totalmente determinístico (mesmo input sempre gera mesmo output)', () => {
    const call1 = getDeterministicSuggestions('Frango', mockAvailableFoods, 'gram', '100g');
    const call2 = getDeterministicSuggestions('Frango', mockAvailableFoods, 'gram', '100g');
    expect(call1).toEqual(call2);
  });
});

describe('Motor V3 - Recálculo de Macros', () => {
  it('deve calcular macros corretamente para gramas (base 100g)', () => {
    const item = { kcal: 160, protein: 30, carbs: 0, fat: 4, measurementType: 'gram' as const };
    const result = calculateItemMacros(item, 200); // 200g
    expect(result.kcal).toBe(320);
    expect(result.protein).toBe(60);
  });

  it('deve calcular macros corretamente para unidades', () => {
    const item = { kcal: 70, protein: 6, carbs: 0, fat: 5, measurementType: 'unit' as const };
    const result = calculateItemMacros(item, 3); // 3 unidades
    expect(result.kcal).toBe(210);
    expect(result.protein).toBe(18);
  });
});
