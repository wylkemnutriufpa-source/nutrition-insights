
import { NutriCoreV3Adapter } from "../lib/nutricore_v2/adapter";
import { PatientContext } from "../features/clinical-engine/types/clinical-types";

async function validate() {
  const patients = [
    { name: 'Luciana (Explosão)', weight: 80, goal: 'lose_weight', height: 174, age: 35, gender: 'female' },
    { name: 'Débora (Padrão)', weight: 69, goal: 'manutencao', height: 160, age: 40, gender: 'female' },
    { name: 'Catharina (Atleta)', weight: 76, goal: 'lose_weight', height: 168, age: 30, gender: 'female' }
  ];

  for (const p of patients) {
    console.log(`\nValidando ${p.name}...`);
    const context: PatientContext = {
      id: 'val-id',
      name: p.name,
      weight: p.weight,
      height: p.height,
      age: p.age,
      gender: p.gender as any,
      goal: p.goal as any,
      activityLevel: 'moderado',
      calories_target: 2000,
      protein_target: 150,
      carbs_target: 200,
      fat_target: 60,
      restrictions: [],
      preferences: []
    };

    const plan = await NutriCoreV3Adapter.generateElitePlan(context, []);
    
    // 1. Hierarchy Check
    const missingHierarchy = plan.some(m => m.items.some(i => !i.blockId));
    if (missingHierarchy) {
      console.error(`❌ ERRO: Hierarquia ausente em alguns itens do plano de ${p.name}`);
    } else {
      console.log(`✅ Hierarquia preservada (blockId presente em todos os itens)`);
    }

    // 2. Clinical Coherence (Breakfast check)
    const breakfast = plan.find(m => m.name.toLowerCase().includes('café'));
    if (breakfast) {
      const hasLunchItems = breakfast.items.some(i => 
        ['arroz', 'feijão', 'steak', 'frango grelhado'].some(bad => i.name.toLowerCase().includes(bad))
      );
      if (hasLunchItems) {
        console.error(`❌ ERRO: Itens de almoço detectados no café de ${p.name}`);
      } else {
        console.log(`✅ Café da manhã coerente`);
      }
    }

    // 3. Scaling Check
    const explosiveItems = plan.flatMap(m => m.items).filter(i => i.quantity > 5000);
    if (explosiveItems.length > 0) {
      console.error(`❌ ERRO: Itens explosivos detectados (>5kg) no plano de ${p.name}`);
    } else {
      console.log(`✅ Quantidades humanas preservadas`);
    }
  }
}

validate().catch(console.error);
