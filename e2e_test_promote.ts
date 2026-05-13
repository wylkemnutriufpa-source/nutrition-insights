import { createClient } from '@supabase/supabase-js';
import { promoteDraftToMealPlan } from './src/features/editor-v3/services/promoteDraft';

// Mock values for manual promote simulation
const draft = {
  id: '12d3e1cb-6665-454c-a2c7-64980c4437a6',
  patient_id: '59da7398-dc14-4faf-bf8d-9dfc23055709',
  nutritionist_id: '67f47696-a778-4ada-9ff9-9615fb7a7c48',
  tenant_id: '20081963-8db9-4a6c-8181-6a820b86e12f',
  payload: {
    meals: [{
      id: "meal-1",
      name: "Almoço E2E",
      time: "12:00",
      items: [{
        id: "1",
        name: "Arroz Branco",
        kcal: 130,
        protein: 2.5,
        carbs: 28,
        fat: 0.2,
        quantity: 100,
        measurementType: "gram",
        instanceId: "inst-1",
        substitutions: [{
          name: "Batata Doce",
          kcal: 86,
          protein: 1.6,
          carbs: 20,
          fat: 0.1,
          suggestedQuantity: 100
        }]
      }]
    }]
  }
};

async function testPromote() {
  console.log("🚀 Starting E2E Promote Validation...");
  const result = await promoteDraftToMealPlan(draft as any);
  console.log("Result:", JSON.stringify(result, null, 2));
}

testPromote().catch(console.error);
