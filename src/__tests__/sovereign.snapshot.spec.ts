/**
 * 🛡️ TESTES FORENSES — SOBERANIA DO SNAPSHOT
 *
 * Suíte de testes que valida invariantes arquiteturais do FitJourney 2.0.
 * NUNCA remover ou desativar estes testes.
 * Eles são a última linha de defesa contra regressões.
 */

import { describe, it, expect } from 'vitest';
import { extractMealsFromSnapshot } from '@/lib/sovereign/extractMealsFromSnapshot';
import { assertSnapshotIntegrity } from '@/lib/sovereign/invariantAssertions';

// ── FIXTURES ────────────────────────────────────────────────────────────────

const VALID_SNAPSHOT = {
  snapshot_version: 'v3' as const,
  publication_id: 'test-pub-id',
  generated_at: '2026-05-24T00:00:00Z',
  targets: { kcal: 1500, protein_g: 80, carbs_g: 180, fat_g: 50 },
  daily_totals: { 1: { kcal: 1500, protein_g: 80, carbs_g: 180, fat_g: 50 } },
  days: [{
    day_of_week: 1,
    meals: [{
      id: 'meal-1',
      name: 'Café da Manhã',
      time: '08:00',
      macros: { kcal: 410, protein_g: 20, carbs_g: 50, fat_g: 10 },
      items: [{
        id: 'item-1',
        title: 'Pão Integral',
        quantity_display: '50g',
        clinical_mass_g: 50,
        macros: { kcal: 120, protein_g: 4, carbs_g: 24, fat_g: 1 },
        visual: { image_url: 'https://cdn.fitjourney.com/pao.jpg', is_placeholder: false },
        substitutions: [{
          id: 'sub-1',
          title: 'Tapioca',
          quantity_display: '50g',
          macros: { kcal: 150, protein_g: 1, carbs_g: 37, fat_g: 0 },
          visual: { image_url: 'https://cdn.fitjourney.com/tapioca.jpg', is_placeholder: false }
        }]
      }]
    }]
  }]
};

// ── TESTES DE SNAPSHOT SOBERANO ──────────────────────────────────────────────

describe('🛡️ Sovereign Snapshot Integrity', () => {

  it('snapshot válido passa na verificação de integridade', () => {
    expect(() => assertSnapshotIntegrity(VALID_SNAPSHOT, 'test')).not.toThrow();
  });

  it('snapshot sem targets DEVE falhar', () => {
    const invalid = { ...VALID_SNAPSHOT, targets: undefined };
    expect(() => assertSnapshotIntegrity(invalid, 'test')).toThrow(/SNAPSHOT_HAS_TARGETS/);
  });

  it('snapshot sem daily_totals DEVE falhar', () => {
    const invalid = { ...VALID_SNAPSHOT, daily_totals: {} };
    expect(() => assertSnapshotIntegrity(invalid, 'test')).toThrow(/SNAPSHOT_HAS_DAILY_TOTALS/);
  });

  it('snapshot V1/V2 (sem snapshot_version) DEVE falhar', () => {
    const legacy = { ...VALID_SNAPSHOT, snapshot_version: 'v2' as any };
    expect(() => assertSnapshotIntegrity(legacy, 'test')).toThrow(/SNAPSHOT_VERSION_V3/);
  });

  it('snapshot sem days DEVE falhar', () => {
    const invalid = { ...VALID_SNAPSHOT, days: [] };
    expect(() => assertSnapshotIntegrity(invalid, 'test')).toThrow(/SNAPSHOT_HAS_DAYS/);
  });

});

// ── TESTES DE EXTRAÇÃO SOBERANA ──────────────────────────────────────────────

describe('🛡️ extractMealsFromSnapshot — Passive Renderer', () => {

  it('extrai itens sem modificar o snapshot original', () => {
    const snapshotCopy = JSON.parse(JSON.stringify(VALID_SNAPSHOT));
    const result = extractMealsFromSnapshot(VALID_SNAPSHOT);

    // Snapshot não deve ser mutado
    expect(VALID_SNAPSHOT).toEqual(snapshotCopy);
    expect(result.isValidV3).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('mesmo snapshot sempre gera mesmos items (determinístico)', () => {
    const result1 = extractMealsFromSnapshot(VALID_SNAPSHOT);
    const result2 = extractMealsFromSnapshot(VALID_SNAPSHOT);

    expect(result1.items.map(i => i.title)).toEqual(result2.items.map(i => i.title));
    expect(result1.items.map(i => i.macros.kcal)).toEqual(result2.items.map(i => i.macros.kcal));
  });

  it('NÃO recalcula macros — usa os do snapshot', () => {
    const result = extractMealsFromSnapshot(VALID_SNAPSHOT);
    const item = result.items[0];

    // Macros vêm direto do snapshot, sem recálculo
    expect(item.macros.kcal).toBe(120);
    expect(item.macros.protein_g).toBe(4);
  });

  it('imageUrl vem de visual.image_url (planos publicados)', () => {
    const result = extractMealsFromSnapshot(VALID_SNAPSHOT);
    const item = result.items[0];
    expect(item.imageUrl).toBe('https://cdn.fitjourney.com/pao.jpg');
  });

  it('substituições são preservadas com todos os campos', () => {
    const result = extractMealsFromSnapshot(VALID_SNAPSHOT);
    const item = result.items[0];

    expect(item.substitutions.length).toBe(1);
    expect(item.substitutions[0].title).toBe('Tapioca');
    expect(item.substitutions[0].macros.kcal).toBe(150);
  });

  it('metadata.substitution_count é populado corretamente', () => {
    const result = extractMealsFromSnapshot(VALID_SNAPSHOT);
    const item = result.items[0];

    expect(item.metadata.substitution_count).toBe(1);
    expect(item.metadata.substitution_options.length).toBe(1);
  });

  it('snapshot inválido (V1) retorna items vazio sem crash', () => {
    const legacyData = { meal_plan_items: [], editor_version: 'v1' };
    const result = extractMealsFromSnapshot(legacyData);

    expect(result.isValidV3).toBe(false);
    expect(result.items).toEqual([]);
  });

  it('snapshot null/undefined retorna items vazio sem crash', () => {
    expect(extractMealsFromSnapshot(null).items).toEqual([]);
    expect(extractMealsFromSnapshot(undefined).items).toEqual([]);
  });

});

// ── TESTES DE SOBERANIA CLÍNICA ──────────────────────────────────────────────

describe('🛡️ Clinical Metadata Sovereignty', () => {

  it('revision_number deve ser monotônico', () => {
    const { assertRevisionMonotonic } = require('@/lib/sovereign/invariantAssertions');
    expect(() => assertRevisionMonotonic(1, 2, 'test')).not.toThrow();
    expect(() => assertRevisionMonotonic(2, 1, 'test')).toThrow(/REVISION_NUMBER_MONOTONIC/);
    expect(() => assertRevisionMonotonic(1, 1, 'test')).toThrow(/REVISION_NUMBER_MONOTONIC/);
  });

});

// ── TESTES ANTI-LEGADO ───────────────────────────────────────────────────────

describe('🛡️ Anti-Legacy Guard', () => {

  it('assertNotLegacyCode lança erro para símbolos proibidos em dev', () => {
    const { assertNotLegacyCode } = require('@/lib/sovereign/invariantAssertions');
    expect(() => assertNotLegacyCode('calculatePrimaryTotals', 'test')).toThrow(/LEGACY/);
    expect(() => assertNotLegacyCode('getBestMealImage', 'test')).toThrow(/LEGACY/);
    expect(() => assertNotLegacyCode('localGenerateMealPlan', 'test')).toThrow(/LEGACY/);
  });

  it('assertNotLegacyCode NÃO lança erro para símbolos legítimos', () => {
    const { assertNotLegacyCode } = require('@/lib/sovereign/invariantAssertions');
    expect(() => assertNotLegacyCode('extractMealsFromSnapshot', 'test')).not.toThrow();
    expect(() => assertNotLegacyCode('buildSovereignSnapshot', 'test')).not.toThrow();
  });

});
