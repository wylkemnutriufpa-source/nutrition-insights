import { describe, it, expect } from 'vitest';
import {
  clampScaleFactor,
  clampItemKcal,
  clampItemGrams,
  assertSafeMacro,
  MACRO_SAFETY_LIMITS,
} from '@/lib/macroSafety';

describe('macroSafety — guardrails contra loop multiplicativo', () => {
  it('clampScaleFactor nunca permite fator > MAX_SCALE_FACTOR', () => {
    expect(clampScaleFactor(1000)).toBeLessThanOrEqual(MACRO_SAFETY_LIMITS.MAX_SCALE_FACTOR);
    expect(clampScaleFactor(1e10)).toBeLessThanOrEqual(MACRO_SAFETY_LIMITS.MAX_SCALE_FACTOR);
    expect(clampScaleFactor(Infinity)).toBeLessThanOrEqual(MACRO_SAFETY_LIMITS.MAX_SCALE_FACTOR);
  });

  it('clampScaleFactor nunca permite fator < MIN_SCALE_FACTOR', () => {
    expect(clampScaleFactor(0.0001)).toBeGreaterThanOrEqual(MACRO_SAFETY_LIMITS.MIN_SCALE_FACTOR);
    expect(clampScaleFactor(-5)).toBe(1);
    expect(clampScaleFactor(NaN)).toBe(1);
  });

  it('clampItemKcal limita kcal por item ao máximo permitido', () => {
    expect(clampItemKcal(1e22)).toBeLessThanOrEqual(MACRO_SAFETY_LIMITS.MAX_KCAL_PER_ITEM);
    expect(clampItemKcal(50000)).toBe(MACRO_SAFETY_LIMITS.MAX_KCAL_PER_ITEM);
    expect(clampItemKcal(-100)).toBe(0);
    expect(clampItemKcal(NaN)).toBe(0);
    expect(clampItemKcal(500)).toBe(500);
  });

  it('clampItemGrams limita gramas por item', () => {
    expect(clampItemGrams(1e21)).toBeLessThanOrEqual(MACRO_SAFETY_LIMITS.MAX_GRAMS_PER_ITEM);
    expect(clampItemGrams(150)).toBe(150);
  });

  it('assertSafeMacro aborta com valores astronômicos (4.19e+22)', () => {
    expect(() => assertSafeMacro(4.19e22, 'kcal item')).toThrow(/CORRUPÇÃO/);
    expect(() => assertSafeMacro(Infinity, 'x')).toThrow(/CORRUPÇÃO/);
    expect(() => assertSafeMacro(NaN, 'x')).toThrow(/CORRUPÇÃO/);
  });

  it('assertSafeMacro aceita valores clínicos válidos', () => {
    expect(() => assertSafeMacro(2000, 'kcal/dia')).not.toThrow();
    expect(() => assertSafeMacro(150, 'proteina g')).not.toThrow();
    expect(() => assertSafeMacro(0, 'zero')).not.toThrow();
  });

  it('simulação anti-loop: 50 multiplicações consecutivas nunca explodem', () => {
    let kcal = 500;
    for (let i = 0; i < 50; i++) {
      const factor = clampScaleFactor(2000 / Math.max(1, kcal));
      kcal = clampItemKcal(kcal * factor);
    }
    // Mesmo após 50 ciclos, kcal nunca pode passar do limite por item
    expect(kcal).toBeLessThanOrEqual(MACRO_SAFETY_LIMITS.MAX_KCAL_PER_ITEM);
    expect(Number.isFinite(kcal)).toBe(true);
  });
});
