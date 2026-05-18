
import { describe, it, expect, vi } from 'vitest';
import { planPersistenceService } from '../services/planPersistenceService';

vi.mock('@/integrations/supabase/client', () => {
  const mock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data: { tenant_id: '123' }, error: null })),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: { image_url: 'https://test-image.com/food.jpg' }, error: null })),
  };
  return { supabase: mock };
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

  it('deve gerar um snapshot auto-suficiente (congelado)', async () => {
    const snapshot = await planPersistenceService.buildSovereignSnapshot(mockOptions as any);

    // 🛡️ VERIFICAÇÃO 1: Estrutura Base
    expect(snapshot.snapshot_version).toBe('v3');
    expect(snapshot.publication_id).toBeDefined();

    // 🛡️ VERIFICAÇÃO 2: Congelamento de Imagens
    const firstMeal = snapshot.days[0].meals[0];
    const firstItem = firstMeal.items[0];
    
    expect(firstItem.visual.image_url).toBe('https://test-image.com/food.jpg');
    expect(firstItem.visual.is_placeholder).toBe(false);

    // 🛡️ VERIFICAÇÃO 3: Substitutos Congelados
    const sub = firstItem.substitutions[0];
    expect(sub.visual.image_url).toBe('https://test-image.com/food.jpg');
    expect(sub.macros.kcal).toBe(160);
  });

  it('deve falhar se houver divergência de integridade no publish', async () => {
    // Simulando divergência entre targets e snapshot (2000 vs 5000)
    const result = await planPersistenceService.publishPlan({
       ...mockOptions,
       targets: { kcal: 5000, protein: 150, carbs: 200, fat: 60 }
    } as any);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('SNAPSHOT VALIDATION FAILED');
  });
});
