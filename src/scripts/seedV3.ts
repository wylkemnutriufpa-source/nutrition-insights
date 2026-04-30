import { supabase } from "@/integrations/supabase/client";

export const seedV3Database = async () => {
  // Dados de Alimentos
  const foods = [
    { name: 'Ovo cozido', calories: 75, protein: 6, carbs: 0.6, fat: 5, serving_size: '1 unidade (50g)', category: 'proteina', unit: 'g' },
    { name: 'Frango grelhado', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving_size: '100g', category: 'proteina', unit: 'g' },
    { name: 'Arroz branco cozido', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, serving_size: '100g', category: 'carboidrato', unit: 'g' },
    { name: 'Batata doce cozida', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, serving_size: '100g', category: 'carboidrato', unit: 'g' },
    { name: 'Banana prata', calories: 98, protein: 1.3, carbs: 26, fat: 0.3, serving_size: '1 unidade (100g)', category: 'fruta', unit: 'g' },
    { name: 'Whey Protein', calories: 120, protein: 24, carbs: 3, fat: 1, serving_size: '30g', category: 'industrializado', unit: 'g' },
    { name: 'Pasta de amendoim', calories: 95, protein: 4, carbs: 3, fat: 8, serving_size: '15g (1 colher)', category: 'gordura', unit: 'g' }
    // ... add more to reach 50+
  ];

  for (const food of foods) {
    await supabase.from('food_database').insert(food).upsert(food);
  }

  // Marmitas
  const marmitas = [
    { name: 'Marmita: Frango e Batata', fixed_calories: 450, fixed_protein: 35, fixed_carbs: 50, fixed_fat: 10, nutritionist_id: null },
    { name: 'Marmita: Carne e Arroz', fixed_calories: 500, fixed_protein: 38, fixed_carbs: 60, fixed_fat: 12, nutritionist_id: null }
  ];

  for (const marmita of marmitas) {
    await supabase.from('meal_recipes').insert(marmita);
  }

  // Templates
  const templates = [
    { name: 'Café da Manhã Fit', meal_type: 'cafe', foods_structure: [{name: 'Ovo cozido', kcal: 75, protein: 6, carbs: 0.6, fat: 5, portion: '1 unidade'}] },
    { name: 'Almoço Low Carb', meal_type: 'almoco', foods_structure: [{name: 'Frango grelhado', kcal: 165, protein: 31, carbs: 0, fat: 3.6, portion: '100g'}] }
  ];

  for (const t of templates) {
    await supabase.from('nutritionist_meal_templates').insert(t);
  }
};
