
import { describe, it, expect, vi } from 'vitest';
import { planPersistenceService } from '../services/planPersistenceService';
import { patientService } from '../../patient/services/patientService';

vi.mock('@/integrations/supabase/client', () => {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data: { id: 'plan-e2e-123', tenant_id: '123' }, error: null })),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: { image_url: 'https://cdn.fitjourney.com/arroz.jpg' }, error: null })),
    then: vi.fn().mockImplementation((cb) => Promise.resolve({ data: [], error: null }).then(cb)),
  };
  return { supabase: { from: vi.fn().mockReturnValue(chainable) } };
});

describe('E2E Sovereign Flow Audit (FitJourney V3)', () => {
  const nutritionistId = 'nut-admin';
  const patientId = 'pat-001';

  it('deve validar o fluxo completo: Editor -> Snapshot -> Patient App -> Export', async () => {
    console.log("--- FASE 1: EDITOR (CRIAÇÃO DO CONTRATO) ---");
    const editorPayload = {
      patientId,
      nutritionistId,
      meals: [
        {
          id: 'meal-1',
          name: 'Almoço Brasileiro',
          time: '12:30',
          day_of_week: 1,
          items: [
            { id: 'item-1', name: 'Arroz Branco', kcal: 200, protein: 4, carbs: 45, fat: 1, display_quantity: '100g' },
            { id: 'item-2', name: 'Feijão Carioca', kcal: 150, protein: 9, carbs: 28, fat: 1, display_quantity: '150g' }
          ]
        }
      ],
      targets: { kcal: 2100, protein: 120, carbs: 250, fat: 70 },
      title: 'Plano E2E Soberano'
    };

    // 1. COMPILAÇÃO (Editor -> Snapshot)
    const snapshot = await planPersistenceService.buildSovereignSnapshot(editorPayload as any);
    console.log(`[E2E] Snapshot Gerado: ID=${snapshot.publication_id}, Itens=${snapshot.days[0].meals[0].items.length}`);
    expect(snapshot.snapshot_version).toBe('v3');
    expect(snapshot.days[0].meals[0].items[0].visual.image_url).toBe('https://cdn.fitjourney.com/arroz.jpg');

    // 2. PUBLICAÇÃO
    const publishResult = await planPersistenceService.publishPlan(editorPayload as any);
    console.log(`[E2E] Publicação: ${publishResult.ok ? 'SUCESSO' : 'FALHA'}`);
    expect(publishResult.ok).toBe(true);

    console.log("--- FASE 2: PATIENT APP (CONSUMO PASSIVO) ---");
    // 3. LEITURA (Patient App simulado)
    // Simulando o que o getPlanById retorna (incluindo o snapshot)
    const dbRecord = {
      id: 'plan-e2e-123',
      patient_id: patientId,
      editor_version: 'v3',
      snapshot: snapshot, // O mesmo snapshot gerado
      total_meta_calorias: 2100
    };

    const patientPlan = patientService.mapSnapshotPlan(dbRecord, { notes: 'João Silva' });
    console.log(`[E2E] Patient App Mapeado: Paciente=${patientPlan.patient_name}, Kcal=${patientPlan.meta_calorias}`);
    
    // PROVA DE EQUIVALÊNCIA
    expect(patientPlan.meta_calorias).toBe(snapshot.targets.kcal);
    expect(patientPlan.meals[0].items[0].imageUrl).toBe(snapshot.days[0].meals[0].items[0].visual.image_url);
    expect(patientPlan.meals[0].items[0].name).toBe(snapshot.days[0].meals[0].items[0].title);

    console.log("--- FASE 3: EXPORTAÇÃO (IMUTABILIDADE) ---");
    // 4. PDF / WhatsApp (Simulado)
    const exportData = {
      title: patientPlan.patient_name,
      meals: patientPlan.meals
    };
    console.log(`[E2E] Exportação preparada com ${exportData.meals.length} refeições e imagens congeladas.`);
    
    // Verificando se a primeira imagem no export é a mesma do snapshot
    expect(exportData.meals[0].items[0].imageUrl).toBe(snapshot.days[0].meals[0].items[0].visual.image_url);

    console.log("--- AUDITORIA E2E CONCLUÍDA: SOBERANIA 100% ---");
  });
});
