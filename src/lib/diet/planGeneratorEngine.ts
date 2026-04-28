import { supabase } from "@/integrations/supabase/client";
import { Food, Meal } from "@/stores/diet-builder/useDietStore";

export type PlanType = 
  | 'hipertrofia' 
  | 'emagrecimento' 
  | 'simples' 
  | 'low_carb' 
  | 'cetogenico' 
  | 'marmitas' 
  | 'receitas' 
  | 'elaborado';

export interface PatientData {
  id: string;
  name: string;
  goal: string;
  restrictions: string[];
  preferences: string[];
  calories_target: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
  routine_meals_count: number;
}

export async function fetchPatientAnamnesis(userId?: string): Promise<PatientData | null> {
  let query = supabase.from('patient_anamnesis').select('*');
  
  if (userId && userId !== 'dummy-user-id') {
    query = query.eq('user_id', userId);
  } else {
    // Busca o primeiro disponível para demonstração se nenhum ID for passado
    query = query.limit(1);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) return null;

  const answers = data.answers as any || {};
  
  return {
    id: data.user_id,
    name: answers.name || 'Paciente',
    goal: answers.goal || 'maintenance',
    restrictions: answers.allergies || [],
    preferences: answers.preferences || [],
    calories_target: Number(data.computed_kcal_target) || 2000,
    protein_target: Number(data.computed_protein) || 150,
    carbs_target: Number(data.computed_carbs) || 200,
    fat_target: Number(data.computed_fat) || 60,
    routine_meals_count: Number(answers.meals_count) || 4,
  };
}

export async function generateMealPlan(patientData: PatientData, type: PlanType): Promise<Meal[]> {
  console.log(`[Engine] Gerando plano ${type} para ${patientData.name}`);
  
  // 1. Definir estrutura de refeições
  const mealCount = patientData.routine_meals_count;
  const meals: Meal[] = [];
  
  const mealNames = ['Café da Manhã', 'Almoço', 'Lanche', 'Jantar', 'Lanche 2', 'Ceia'];
  
  // 2. Aplicar lógica determinística por tipo
  let calories = patientData.calories_target;
  let protein = patientData.protein_target;
  let carbs = patientData.carbs_target;
  let fat = patientData.fat_target;

  if (type === 'hipertrofia') {
    calories *= 1.15; // Superávit
    protein *= 1.1;
  } else if (type === 'emagrecimento') {
    calories *= 0.85; // Déficit
    carbs *= 0.7;
  } else if (type === 'low_carb') {
    carbs = (calories * 0.2) / 4;
    fat = (calories * 0.5) / 9;
  } else if (type === 'cetogenico') {
    carbs = (calories * 0.05) / 4;
    fat = (calories * 0.75) / 9;
  }

  // 3. Buscar alimentos base (Simulado ou da biblioteca)
  // No mundo real, buscaríamos da 'meal_library' filtrando por clinical_tags
  const baseFoods = await getBaseFoodsForType(type, patientData.restrictions);

  // 4. Distribuir macros entre refeições
  const distribution = [0.25, 0.35, 0.15, 0.25]; // Exemplo de distribuição para 4 refeições
  
  for (let i = 0; i < Math.min(mealCount, 4); i++) {
    const targetKcal = calories * distribution[i];
    const items: Food[] = [];
    
    // Selecionar alimentos baseados no tipo de refeição e plano
    const mealItems = selectItemsForMeal(mealNames[i], type, targetKcal, baseFoods);
    
    meals.push({
      id: (i + 1).toString(),
      type: mealNames[i],
      items: mealItems
    });
  }

  return meals;
}

async function getBaseFoodsForType(type: PlanType, restrictions: string[]) {
  // Simulação de busca no banco. 
  // Em produção, isso usaria a `meal_library`
  const foods = [
    { name: 'Ovo Mexido', calories: 150, protein: 12, carbs: 1, fat: 10, types: ['breakfast'] },
    { name: 'Pão Integral', calories: 120, protein: 5, carbs: 22, fat: 2, types: ['breakfast'] },
    { name: 'Frango Grelhado', calories: 165, protein: 31, carbs: 0, fat: 4, types: ['lunch', 'dinner'] },
    { name: 'Arroz Integral', calories: 130, protein: 3, carbs: 28, fat: 1, types: ['lunch', 'dinner'] },
    { name: 'Feijão Carioca', calories: 76, protein: 5, carbs: 14, fat: 0, types: ['lunch', 'dinner'] },
    { name: 'Banana', calories: 90, protein: 1, carbs: 23, fat: 0, types: ['breakfast', 'snack'] },
    { name: 'Whey Protein', calories: 120, protein: 24, carbs: 3, fat: 2, types: ['snack'] },
    { name: 'Iogurte Natural', calories: 100, protein: 8, carbs: 10, fat: 4, types: ['breakfast', 'snack'] },
  ];

  return foods.filter(f => !restrictions.some(r => f.name.toLowerCase().includes(r.toLowerCase())));
}

function selectItemsForMeal(mealName: string, type: PlanType, targetKcal: number, baseFoods: any[]): Food[] {
  // Lógica simples de preenchimento para atingir as calorias
  const mealType = mealName.toLowerCase().includes('café') ? 'breakfast' : 
                   (mealName.toLowerCase().includes('lanche') ? 'snack' : 'lunch');
  
  const candidates = baseFoods.filter(f => f.types.includes(mealType));
  const selected: Food[] = [];
  let currentKcal = 0;

  // Tenta pegar pelo menos 2-3 itens
  for (const cand of candidates) {
    if (currentKcal + cand.calories <= targetKcal * 1.2) {
      selected.push({
        id: Math.random().toString(36).substr(2, 9),
        name: cand.name,
        calories: cand.calories,
        protein: cand.protein,
        carbs: cand.carbs,
        fat: cand.fat
      });
      currentKcal += cand.calories;
    }
    if (selected.length >= 3 || currentKcal >= targetKcal) break;
  }

  return selected;
}
