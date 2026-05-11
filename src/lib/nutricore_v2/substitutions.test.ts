import { expect, test } from 'vitest';
import { getSubstitutions } from './substitutions';
import { BASE_FOODS } from './food-database';

test('SUBSTITUIÇÕES: Tapioca 70g deve ter Pão Integral ~60g', () => {
  const tapioca = BASE_FOODS.find(f => f.name.includes('Tapioca'))!;
  const pão = BASE_FOODS.find(f => f.name.includes('Pão Integral'))!;
  
  const subs = getSubstitutions(tapioca, BASE_FOODS, 70);
  const pãoSub = subs.find(s => s.food.name.includes('Pão Integral'));
  
  expect(pãoSub).toBeDefined();
  console.log('Tapioca 70g Sub for Pão Integral:', pãoSub?.grams, pãoSub?.unit_label);
  expect(pãoSub?.grams).toBeLessThan(100);
});

test('SUBSTITUIÇÕES: Frango 150g deve ter Tilápia ~180g (Equivalência Proteína)', () => {
  const frango = BASE_FOODS.find(f => f.name.includes('Frango'))!;
  const tilápia = BASE_FOODS.find(f => f.name.includes('Tilápia'))!;
  
  const subs = getSubstitutions(frango, BASE_FOODS, 150);
  const tilápiaSub = subs.find(s => s.food.name.includes('Tilápia'));
  
  console.log('Frango 150g Sub for Tilápia:', tilápiaSub?.grams, tilápiaSub?.unit_label);
  expect(tilápiaSub?.grams).toBeDefined();
  expect(tilápiaSub?.grams).toBeGreaterThan(150);
});

test('SUBSTITUIÇÕES: Maçã 150g deve ter Banana ~80g (Equivalência Calórica)', () => {
  const maçã = BASE_FOODS.find(f => f.name === 'Maçã')!;
  const banana = BASE_FOODS.find(f => f.name.includes('Banana'))!;
  
  const subs = getSubstitutions(maçã, BASE_FOODS, 150);
  const bananaSub = subs.find(s => s.food.name.includes('Banana'));
  
  console.log('Maçã 150g Sub for Banana:', bananaSub?.grams, bananaSub?.unit_label);
  expect(bananaSub?.grams).toBeLessThan(100);
});

test('SUBSTITUIÇÕES: Frango não deve ter Café como substituto', () => {
  const frango = BASE_FOODS.find(f => f.name.includes('Frango'))!;
  const cafe: any = { id: 'coffee', name: 'Café sem açúcar', category: 'bebida', protein_100g: 0, carb_100g: 0, fat_100g: 0, kcal_100g: 1, base_grams: 100, unit: 'ml' };
  
  const subs = getSubstitutions(frango, [...BASE_FOODS, cafe], 150);
  const cafeSub = subs.find(s => s.food.name.includes('Café'));
  
  expect(cafeSub).toBeUndefined();
});
