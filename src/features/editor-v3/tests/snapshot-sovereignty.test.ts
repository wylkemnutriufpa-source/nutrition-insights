
import { describe, it, expect, vi } from 'vitest';
import { planPersistenceService } from '../services/planPersistenceService';

vi.mock('@/integrations/supabase/client', () => {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data: { id: 'new-plan-123', tenant_id: '123' }, error: null })),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: { image_url: 'https://test-image.com/food.jpg' }, error: null })),
    then: vi.fn().mockImplementation((cb) => Promise.resolve({ data: [], error: null }).then(cb)),
  };
  
  const mockSupabase = {
    from: vi.fn().mockReturnValue(chainable),
  };
  
  return { supabase: mockSupabase };
});

describe('Sovereign Snapshot Integrity (V3)', () => {
  const mockOptions = {
    patientId: 'pat-123',
    nutritionistId: 'nut-456',
    meals: [
      {
        id: 'm1',
        name: 'Café da Manhã Fitness',
        time: '08:00',
        day_of_week: 1,
        items: [
          {
            id: 'it1',
            name: 'Pão Integral',
            kcal: 150,
            protein: 5,
            carbs: 25,
            fat: 2,
            display_quantity: '2 fatias',
            substitutions: [
              { id: 'sub1', name: 'Tapioca', kcal: 160, protein: 1, carbs: 38, fat: 0 }
            ]
          }
        ]
      }
    ],
    targets: { kcal: 2000, protein: 150, carbs: 200, fat: 60 },
    title: 'Plano de Teste Soberano'
  };

  it('deve garantir Equivalência Total: Editor (Build) == Snapshot (Publish)', async () => {
    // 1. O que o Editor produz
    const editorSnapshot = await planPersistenceService.buildSovereignSnapshot(mockOptions as any);

    // 2. O que é publicado
    const result = await planPersistenceService.publishPlan(mockOptions as any);
    expect(result.ok).toBe(true);

    // 3. Validar se o snapshot publicado contém a versão correta e dados congelados
    expect(editorSnapshot.snapshot_version).toBe('v3');
    expect(editorSnapshot.days[0].meals[0].items[0].visual.image_url).toBe('https://test-image.com/food.jpg');
    expect(editorSnapshot.targets.kcal).toBe(2000);
  });

  it('deve falhar se o snapshot for gerado com macros zerados', async () => {
    const invalidOptions = { ...mockOptions, targets: { kcal: 0, protein: 0, carbs: 0, fat: 0 } };
    const result = await planPersistenceService.publishPlan(invalidOptions as any);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('SNAPSHOT INCOMPLETO');
  });
});
