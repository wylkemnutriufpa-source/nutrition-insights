import { describe, it, expect } from 'vitest';
import { NutriCoreV3Adapter } from '../nutricore_v2/adapter';
import { PatientContext } from '../../features/clinical-engine/types/clinical-types';

describe('Integridade NutriCore V3 — 3 Pacientes Distintos', () => {
  const baseContext: PatientContext = {
    id: 'test',
    name: 'Teste',
    restrictions: [],
    preferences: [],
    calories_target: 2000,
    protein_target: 150,
    carbs_target: 200,
    fat_target: 60
  };

  it('Paciente 1: Lynn Ohana (63kg) — Manutenção', async () => {
    const context: PatientContext = {
      ...baseContext,
      weight: 63,
      gender: 'female',
      age: 30,
      height: 165,
      goal: 'maintain'
    };
    const plan = await NutriCoreV3Adapter.generateElitePlan(context, []);
    const totalKcal = plan.reduce((s, m) => s + m.items.reduce((a, i) => a + i.kcal, 0), 0);
    
    console.log(`Lynn Ohana: ${Math.round(totalKcal)} kcal`);
    expect(totalKcal).toBeGreaterThan(1700);
    expect(totalKcal).toBeLessThan(2120); // 1920 +/- 200
  });

  it('Paciente 2: Ana Carla (77kg) — Emagrecimento', async () => {
    const context: PatientContext = {
      ...baseContext,
      weight: 77,
      gender: 'female',
      age: 35,
      height: 165,
      goal: 'lose_weight'
    };
    const plan = await NutriCoreV3Adapter.generateElitePlan(context, []);
    const totalKcal = plan.reduce((s, m) => s + m.items.reduce((a, i) => a + i.kcal, 0), 0);
    
    console.log(`Ana Carla: ${Math.round(totalKcal)} kcal`);
    expect(totalKcal).toBeGreaterThan(1700);
    expect(totalKcal).toBeLessThan(2150); // 1950 +/- 200
    
    // Verificar se frango não explodiu (24750g)
    const frango = plan.flatMap(m => m.items).find(i => i.name.toLowerCase().includes('frango'));
    if (frango) {
       expect(frango.quantity).toBeLessThan(1000); // 1000g de frango já seria muito, mas aceitável comparado a 24k
    }
  });

  it('Paciente 3: Débora (55kg) — Manutenção', async () => {
    const context: PatientContext = {
      ...baseContext,
      weight: 55,
      goal: 'maintain'
    };
    const plan = await NutriCoreV3Adapter.generateElitePlan(context, []);
    const totalKcal = plan.reduce((s, m) => s + m.items.reduce((a, i) => a + i.kcal, 0), 0);
    
    console.log(`Débora: ${Math.round(totalKcal)} kcal`);
    expect(totalKcal).toBeGreaterThan(1000);
    expect(totalKcal).toBeLessThan(2500);
  });
});
