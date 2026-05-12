import { describe, it, expect } from 'vitest';
import { normalizeFood } from '../utils/normalization';
import { calculateItemMacros, getSubstitutionsWithGrams } from '@/lib/nutricore_v2/helpers';

describe('EditorV3 Normalization & Substitution Blindagem', () => {
  
  const arrozCooked = {
    id: 'arroz-1',
    name: 'Arroz Branco Cozido',
    kcal_100g: 130,
    protein_100g: 2.5,
    carb_100g: 28,
    fat_100g: 0.2,
    measurementType: 'gram',
    quantity: 125,
    portionValue: 100,
    category: 'carb'
  };

  const paoForma = {
    id: 'pao-1',
    name: 'Pão de Forma Integral',
    kcal_100g: 250,
    protein_100g: 9,
    carb_100g: 45,
    fat_100g: 3,
    measurementType: 'unit',
    portionValue: 25, // 1 fatia = 25g
    portionLabel: 'fatia',
    imageUrl: 'pao.jpg',
    category: 'carb'
  };

  it('1. Normalização: 125g arroz -> 5 colheres', () => {
    const normalized = normalizeFood(arrozCooked) as any;
    
    expect(normalized.measurementType).toBe('spoon');
    expect(normalized.portionValue).toBe(25); // colher de sopa para arroz
    expect(normalized.quantity).toBe(5); // 125 / 25 = 5
    expect(normalized.portionLabel).toBe('colher de sopa');
    
    console.log('[Test] Before: 125g Arroz | After:', normalized.quantity, normalized.portionLabel);
  });

  it('2. Idempotência: rodar normalização duas vezes não altera valores', () => {
    const firstPass = normalizeFood(arrozCooked) as any;
    const secondPass = normalizeFood(firstPass) as any;
    
    expect(secondPass.quantity).toBe(5);
    expect(secondPass.measurementType).toBe('spoon');
    expect(secondPass.portionValue).toBe(25);
    
    console.log('[Test] Idempotency check passed: 5 colheres remained 5 colheres');
  });

  it('3. Consistência de Massa: 5 colheres -> massa absoluta continua 125g', () => {
    const normalized = normalizeFood(arrozCooked) as any;
    // calculateItemMacros usa resolveMacroGrams que faz: quantity * portionValue se for spoon
    const macros = calculateItemMacros(normalized, normalized.quantity);
    
    // Arroz 130kcal/100g. 125g deve ter 162.5 kcal.
    expect(macros.kcal).toBe(162.5);
    
    console.log('[Test] Macros for 5 spoons (125g):', macros.kcal, 'kcal');
  });

  it('4. Substituição: 125g arroz -> pão equivalente (~65g / 2.6 fatias)', () => {
    const normalizedArroz = normalizeFood(arrozCooked) as any;
    
    const subs = getSubstitutionsWithGrams({
      base_item: normalizedArroz,
      base_grams: 125,
      available_foods: [paoForma],
      image_bank: []
    });

    expect(subs.length).toBe(1);
    const paoSub = subs[0];
    
    // 125g arroz = 162.5 kcal
    // Pão = 2.5 kcal/g
    // 162.5 / 2.5 = 65g
    expect(paoSub.gramas).toBe(65);
    // 65g / 25g portionValue = 2.6 fatias
    expect(paoSub.unidade).toContain('2.6 fatia');
    
    console.log('[Test] Substitution result:', paoSub.unidade);
    console.log('[Test] Payload Before (Arroz):', JSON.stringify({ name: normalizedArroz.name, qty: normalizedArroz.quantity, type: normalizedArroz.measurementType }));
    console.log('[Test] Payload After (Pão):', JSON.stringify({ name: paoSub.alimento, qty: paoSub.unidade, kcal: paoSub.calorias_equivalentes }));
  });

  it('5. Blindagem contra Explosão: Normalização de Pão', () => {
    const paoBruto = {
      name: 'Pão Francês',
      quantity: 50,
      measurementType: 'gram',
      kcal_100g: 300,
      portionValue: 100
    };

    const normalized = normalizeFood(paoBruto) as any;
    
    expect(normalized.measurementType).toBe('unit');
    expect(normalized.portionValue).toBe(50);
    expect(normalized.quantity).toBe(1); // 50g / 50g portionValue = 1 unit
    
    console.log('[Test] 50g Pão Francês ->', normalized.quantity, normalized.portionLabel);
  });
});
