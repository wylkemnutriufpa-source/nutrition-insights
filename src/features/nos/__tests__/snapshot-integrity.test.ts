import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

/**
 * SPRINT K — Testes de Integridade de Snapshots
 * 
 * Valida que snapshots são imutáveis após publicação
 * e contêm todos os dados necessários
 */

describe('Snapshot Integrity Tests', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeEach(() => {
    // Inicializar cliente Supabase
    supabase = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.VITE_SUPABASE_ANON_KEY || ''
    );
  });

  describe('Teste 1: Snapshot não pode ser modificado após publicação', () => {
    it('should prevent snapshot modification after publish', async () => {
      // 1. Criar plano
      const { data: plan, error: createError } = await supabase
        .from('meal_plans')
        .insert({
          nutritionist_id: 'test-nutritionist',
          patient_id: 'test-patient',
          name: 'Test Plan',
          status: 'draft',
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(plan).toBeDefined();

      // 2. Publicar plano (snapshot congelado)
      const testSnapshot = {
        meals: [
          {
            slot: 'breakfast',
            items: [
              {
                food_id: 'test-food',
                quantity_g: 100,
                kcal: 150,
                protein: 10,
                carbs: 20,
                fat: 5,
              },
            ],
            totals: {
              kcal: 150,
              protein: 10,
              carbs: 20,
              fat: 5,
            },
          },
        ],
        version_history: [
          {
            version: 1,
            created_at: new Date().toISOString(),
            changes: 'Initial version',
          },
        ],
      };

      const { data: published, error: publishError } = await supabase
        .from('meal_plans')
        .update({
          status: 'published',
          snapshot: testSnapshot,
          published_at: new Date().toISOString(),
        })
        .eq('id', plan.id)
        .select()
        .single();

      expect(publishError).toBeNull();
      expect(published?.status).toBe('published');

      // 3. Tentar modificar snapshot
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({
          snapshot: {
            ...testSnapshot,
            meals: [
              {
                ...testSnapshot.meals[0],
                totals: {
                  kcal: 200, // Tentar modificar
                  protein: 20,
                  carbs: 30,
                  fat: 10,
                },
              },
            ],
          },
        })
        .eq('id', plan.id)
        .eq('status', 'published');

      // 4. Verificar que modificação falha ou é ignorada
      const { data: current } = await supabase
        .from('meal_plans')
        .select('snapshot')
        .eq('id', plan.id)
        .single();

      expect(current?.snapshot.meals[0].totals.kcal).toBe(150);
    });
  });

  describe('Teste 2: Snapshot contém todos os dados necessários', () => {
    it('should contain all required fields in snapshot', async () => {
      const requiredFields = [
        'meals',
        'version_history',
        'created_at',
        'published_at',
      ];

      const { data: plan } = await supabase
        .from('meal_plans')
        .select('snapshot')
        .eq('status', 'published')
        .limit(1)
        .single();

      if (plan?.snapshot) {
        requiredFields.forEach((field) => {
          expect(plan.snapshot).toHaveProperty(field);
        });

        // Validar estrutura de meals
        expect(Array.isArray(plan.snapshot.meals)).toBe(true);
        plan.snapshot.meals.forEach((meal: any) => {
          expect(meal).toHaveProperty('slot');
          expect(meal).toHaveProperty('items');
          expect(meal).toHaveProperty('totals');
          expect(meal.totals).toHaveProperty('kcal');
          expect(meal.totals).toHaveProperty('protein');
          expect(meal.totals).toHaveProperty('carbs');
          expect(meal.totals).toHaveProperty('fat');
        });
      }
    });
  });

  describe('Teste 3: Snapshot não referencia dados externos', () => {
    it('should be self-contained without external references', async () => {
      const { data: plan } = await supabase
        .from('meal_plans')
        .select('snapshot')
        .eq('status', 'published')
        .limit(1)
        .single();

      if (plan?.snapshot) {
        // Verificar que todos os dados estão no snapshot
        plan.snapshot.meals.forEach((meal: any) => {
          meal.items.forEach((item: any) => {
            // Deve ter macros congelados, não referências
            expect(item).toHaveProperty('kcal');
            expect(item).toHaveProperty('protein');
            expect(item).toHaveProperty('carbs');
            expect(item).toHaveProperty('fat');
            expect(typeof item.kcal).toBe('number');
          });
        });
      }
    });
  });

  describe('Teste 4: Snapshot versionado corretamente', () => {
    it('should maintain version history correctly', async () => {
      const { data: plan } = await supabase
        .from('meal_plans')
        .select('snapshot, revision_number')
        .eq('status', 'published')
        .limit(1)
        .single();

      if (plan?.snapshot) {
        expect(plan.snapshot.version_history).toBeDefined();
        expect(Array.isArray(plan.snapshot.version_history)).toBe(true);
        expect(plan.snapshot.version_history.length).toBeGreaterThan(0);

        // Verificar que versões estão em ordem
        const versions = plan.snapshot.version_history;
        for (let i = 1; i < versions.length; i++) {
          expect(versions[i].version).toBeGreaterThan(versions[i - 1].version);
        }
      }
    });
  });

  afterEach(() => {
    // Cleanup
  });
});
