import { describe, test, expect, vi } from "vitest";
import { 
  loadMarmitas, 
  replaceMarmita, 
  calculateDayWithMarmita,
  type Marmita
} from "./marmitaEngine";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        ilike: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ 
            data: Array.from({ length: 19 }).map((_, i) => ({
              id: `marmita_${i}`,
              name: `Marmita ${i}`,
              foods_structure: [{ alimento: 'Frango', gramas: 150 }],
              kcal_base: 400,
              protein_base: 30,
              carbs_base: 40,
              fat_base: 10,
              imageUrl: '/img.jpg'
            })), 
            error: null 
          }))
        })),
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'marmita_tilapia',
              name: 'Marmita Tilápia',
              foods_structure: [{ alimento: 'Tilápia', gramas: 150 }],
              kcal_base: 350,
              protein_base: 35,
              carbs_base: 30,
              fat_base: 5,
              imageUrl: '/img2.jpg'
            },
            error: null
          }))
        }))
      }))
    }))
  }
}));

describe("Phase 5 — Marmita Engine", () => {
  test('Carregar 19 marmitas do banco', async () => {
    const marmitas = await loadMarmitas();
    expect(marmitas.length).toBe(19);
    expect(marmitas[0].tipo).toBe('marmita');
  });

  test('Marmita tem todos os campos obrigatórios', async () => {
    const marmitas = await loadMarmitas();
    const m = marmitas[0];
    expect(m.nome).toBeTruthy();
    expect(m.ingredientes.length).toBeGreaterThan(0);
    expect(m.macros_fixos.calories).toBeGreaterThan(0);
    expect(m.imagem_url).toBeTruthy();
    expect(m.instrucoes).toBeTruthy();
  });

  test('Trocar marmita: almoço frango → almoço tilápia', async () => {
    const newMarmita = await replaceMarmita('marmita_frango', 'marmita_tilapia');
    expect(newMarmita!.nome).toContain('Tilápia');
    expect(newMarmita!.ingredientes[0].alimento).toBe('Tilápia');
  });

  test('Dia com marmita: calorias restantes redistribuídas corretamente', () => {
    const dayPlan = {
      meals: [
        { type: 'cafe', calories: 400, items: [{ nome: 'Pão', gramas: 50 }] },
        { type: 'almoco', calories: 500, items: [{ nome: 'Arroz', gramas: 100 }] },
        { type: 'jantar', calories: 500, items: [{ nome: 'Ovo', gramas: 100 }] }
      ]
    };

    const marmitaFrango: Marmita = {
      id: 'marmita_frango',
      nome: 'Marmita Frango',
      tipo: 'marmita',
      ingredientes: [{ alimento: 'Frango', gramas: 150 }],
      macros_fixos: { calories: 420, protein_g: 30, carbs_g: 30, fat_g: 10 },
      imagem_url: 'img',
      instrucoes: 'instr',
      rendimento: 1
    };

    const targetCalories = 2000;
    const adjusted = calculateDayWithMarmita(dayPlan, { almoco: marmitaFrango }, targetCalories);
    
    // Almoço fixo em 420. Restam 1580.
    const almoco = adjusted.meals.find(m => m.type === 'almoco');
    expect(almoco.calories).toBe(420);
    expect(almoco.isMarmita).toBe(true);

    const nonMarmitaSum = adjusted.meals
      .filter(m => m.type !== 'almoco')
      .reduce((acc, m) => acc + m.calories, 0);
    
    expect(nonMarmitaSum).toBeCloseTo(1580, 0);
  });

  test('Nutri NÃO pode trocar ingrediente da marmita (imutabilidade)', () => {
    const marmita: Marmita = {
      id: 'm1',
      nome: 'Marmita',
      tipo: 'marmita',
      ingredientes: [{ alimento: 'Frango', gramas: 150 }],
      macros_fixos: { calories: 400, protein_g: 30, carbs_g: 30, fat_g: 10 },
      imagem_url: 'img',
      instrucoes: 'instr',
      rendimento: 1
    };

    const dayPlan = { meals: [{ type: 'almoco', calories: 500, items: [] }] };
    const adjusted = calculateDayWithMarmita(dayPlan, { almoco: marmita }, 2000);
    
    const meal = adjusted.meals.find(m => m.type === 'almoco');
    expect(meal.items).toEqual([
      { nome: 'Frango', gramas: 150, isMarmitaPart: true }
    ]);
    
    // If we try to "modify" the meal in the resulting plan, it shouldn't affect the original marmita logic
    meal.items[0].gramas = 999; 
    expect(marmita.ingredientes[0].gramas).toBe(150);
  });
});
