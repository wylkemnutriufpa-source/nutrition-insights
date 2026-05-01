import { supabase } from "@/integrations/supabase/client";
import { Food, MealTemplate } from "../types";

export const searchFoods = async (query: string): Promise<Food[]> => {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from("food_database")
    .select("*")
    .ilike("name", `%${query}%`)
    .limit(20);

  if (error) {
    console.error("Error searching foods:", error);
    return [];
  }

  return (data || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    kcal: f.calories,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    portionValue: 1, // Base value for gram/ml
    portionUnitLabel: f.serving_size?.includes("g") ? "g" : (f.serving_size?.includes("ml") ? "ml" : "unidade"),
    portionUnit: f.serving_size?.includes("g") ? "g" : (f.serving_size?.includes("ml") ? "ml" : "unidade"),
    portionLabel: f.serving_size || "100g",
    measurementType: f.serving_size?.includes("g") ? "gram" : (f.serving_size?.includes("ml") ? "ml" : "unit"),
    imageUrl: undefined
  }));
};

export const searchMarmitas = async (nutritionistId: string | null): Promise<Food[]> => {
  if (!nutritionistId) return [];

  const { data, error } = await supabase
    .from("meal_recipes")
    .select("*")
    .eq("nutritionist_id", nutritionistId)
    .eq("is_active", true);

  if (error) {
    console.error("Error searching marmitas:", error);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    kcal: r.fixed_calories || 0,
    calories: r.fixed_calories || 0,
    protein: r.fixed_protein || 0,
    carbs: r.fixed_carbs || 0,
    fat: r.fixed_fat || 0,
    portionValue: 1,
    portionUnitLabel: "marmita",
    portionUnit: "marmita",
    portionLabel: "1 marmita",
    measurementType: "unit",
    isMarmita: true,
    locked: false, // Permite editar marmitas agora
    imageUrl: r.image_url || undefined,
    ingredients: r.foods_json || [],
    instructions: r.instructions || ""
  }));
};

export const searchTemplates = async (): Promise<MealTemplate[]> => {
  const { data, error } = await supabase
    .from("nutritionist_meal_templates")
    .select("*")
    .order("name")
    .limit(20);

  if (error) {
    console.error("Error searching templates:", error);
    return [];
  }

  return (data || []).map((t: any) => {
    const foods = Array.isArray(t.foods_structure) ? t.foods_structure : [];
    
    return {
      id: t.id,
      name: t.name,
      description: t.goal_tags ? t.goal_tags.join(", ") : (t.meal_type || ""),
      items: foods.map((f: any) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: f.name,
        kcal: f.kcal || 0,
        calories: f.kcal || 0,
        protein: f.protein || 0,
        carbs: f.carbs || 0,
        fat: f.fat || 0,
        portionValue: 1,
        portionUnitLabel: f.portion?.includes("g") ? "g" : (f.portion?.includes("ml") ? "ml" : "unidade"),
        portionUnit: f.portion?.includes("g") ? "g" : (f.portion?.includes("ml") ? "ml" : "unidade"),
        portionLabel: f.portion || "100g",
        measurementType: f.portion?.includes("g") ? "gram" : (f.portion?.includes("ml") ? "ml" : "unit")
      }))
    };
  });
};
export const getFoodMacrosByName = async (names: string[]): Promise<Record<string, { kcal: number, protein: number, carbs: number, fat: number }>> => {
  if (!names.length) return {};
  
  const { data, error } = await supabase
    .from("food_database")
    .select("name, calories, protein, carbs, fat")
    .in("name", names);

  if (error) {
    console.error("Error fetching food macros:", error);
    return {};
  }

  const result: Record<string, any> = {};
  data?.forEach(f => {
    result[f.name.toLowerCase()] = {
      kcal: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat
    };
  });
  return result;
};

export const getCompatibleFoods = async (category: 'protein' | 'carb' | 'fruit' | 'any', currentName: string): Promise<Food[]> => {
  let query = supabase.from("food_database").select("*");
  
  if (category === 'protein') {
    query = query.or('name.ilike.%frango%,name.ilike.%carne%,name.ilike.%peixe%,name.ilike.%ovo%,name.ilike.%whey%,name.ilike.%patinho%,name.ilike.%queijo%');
  } else if (category === 'carb') {
    query = query.or('name.ilike.%arroz%,name.ilike.%batata%,name.ilike.%macarrão%,name.ilike.%feijão%,name.ilike.%pão%,name.ilike.%aveia%,name.ilike.%tapioca%');
  } else if (category === 'fruit') {
    query = query.or('name.ilike.%banana%,name.ilike.%maçã%,name.ilike.%uva%,name.ilike.%laranja%,name.ilike.%mamão%,name.ilike.%abacaxi%');
  }

  const { data, error } = await query.neq('name', currentName).limit(15);

  if (error) {
    console.error("Error fetching compatible foods:", error);
    return [];
  }

  return (data || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    kcal: f.calories,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    portionValue: 1,
    portionUnitLabel: f.serving_size?.includes("g") ? "g" : (f.serving_size?.includes("ml") ? "ml" : "unidade"),
    portionUnit: f.serving_size?.includes("g") ? "g" : (f.serving_size?.includes("ml") ? "ml" : "unidade"),
    portionLabel: f.serving_size || "100g",
    measurementType: f.serving_size?.includes("g") ? "gram" : (f.serving_size?.includes("ml") ? "ml" : "unit"),
  }));
};

export const getBaseFoods = async (): Promise<Food[]> => {
  const commonKeywords = [
    'Arroz', 'Feijão', 'Frango', 'Ovo', 'Pão', 'Banana', 'Maçã', 
    'Batata', 'Macarrão', 'Carne', 'Peixe', 'Patinho', 'Whey', 
    'Iogurte', 'Queijo', 'Aveia', 'Tapioca', 'Alface', 'Tomate', 
    'Brócolis', 'Cenoura', 'Azeite', 'Castanha', 'Amendoim'
  ];
  
  const { data, error } = await supabase
    .from("food_database")
    .select("*")
    .or(commonKeywords.map(k => `name.ilike.%${k}%`).join(','))
    .limit(100);

  if (error) {
    console.error("Error fetching base foods:", error);
    return [];
  }

  return (data || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    kcal: f.calories,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    portionValue: 1,
    portionUnitLabel: f.serving_size?.includes("g") ? "g" : (f.serving_size?.includes("ml") ? "ml" : "unidade"),
    portionUnit: f.serving_size?.includes("g") ? "g" : (f.serving_size?.includes("ml") ? "ml" : "unidade"),
    portionLabel: f.serving_size || "100g",
    measurementType: f.serving_size?.includes("g") ? "gram" : (f.serving_size?.includes("ml") ? "ml" : "unit"),
  }));
};

export const seedBaseData = async (nutritionistId: string): Promise<boolean> => {
  try {
    console.log('[Seed] Iniciando Auto-Seed de Segurança...');

    // 1. Alimentos Essenciais
    const essentialFoods = [
      { name: 'Arroz Branco Cozido', calories: 130, protein: 2.5, carbs: 28, fat: 0.2, serving_size: '100g' },
      { name: 'Feijão Carioca Cozido', calories: 76, protein: 4.8, carbs: 14, fat: 0.5, serving_size: '100g' },
      { name: 'Peito de Frango Grelhado', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving_size: '100g' },
      { name: 'Ovo de Galinha Cozido', calories: 155, protein: 13, carbs: 1.1, fat: 11, serving_size: '100g' },
      { name: 'Banana Nanica', calories: 92, protein: 1.1, carbs: 24, fat: 0.3, serving_size: '100g' },
      { name: 'Maçã Fuji', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, serving_size: '100g' },
      { name: 'Batata Doce Cozida', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, serving_size: '100g' },
      { name: 'Patinho Moído Grelhado', calories: 219, protein: 35.9, carbs: 0, fat: 7.3, serving_size: '100g' },
      { name: 'Pão de Forma Integral', calories: 247, protein: 9.4, carbs: 43, fat: 3.7, serving_size: '100g' },
      { name: 'Aveia em Flocos', calories: 389, protein: 16.9, carbs: 66, fat: 6.9, serving_size: '100g' },
      { name: 'Whey Protein Isolar', calories: 370, protein: 80, carbs: 5, fat: 3, serving_size: '100g' },
      { name: 'Iogurte Natural Integral', calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, serving_size: '100g' },
      { name: 'Queijo Cottage', calories: 98, protein: 11, carbs: 3.4, fat: 4.3, serving_size: '100g' },
      { name: 'Tapioca (Goma)', calories: 240, protein: 0, carbs: 60, fat: 0, serving_size: '100g' },
      { name: 'Alface Crespa', calories: 15, protein: 1.3, carbs: 2.9, fat: 0.2, serving_size: '100g' },
      { name: 'Tomate Italiano', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, serving_size: '100g' },
      { name: 'Brócolis Cozido', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, serving_size: '100g' },
      { name: 'Azeite de Oliva Extra Virgem', calories: 884, protein: 0, carbs: 0, fat: 100, serving_size: '100g' },
      { name: 'Amendoim Torrado', calories: 567, protein: 25.8, carbs: 16.1, fat: 49.2, serving_size: '100g' },
      { name: 'Filé de Tilápia Grelhado', calories: 128, protein: 26, carbs: 0, fat: 2.7, serving_size: '100g' }
    ];

    // Verifica se já existem alimentos
    const { count: foodCount } = await supabase.from('food_database').select('*', { count: 'exact', head: true });
    if (foodCount === 0) {
      console.log('[Seed] Inserindo alimentos essenciais...');
      await supabase.from('food_database').insert(essentialFoods);
    }

    // 2. Marmitas Base
    const baseMarmitas = [
      { nutritionist_id: nutritionistId, name: 'Marmita Fit Frango & Batata Doce', fixed_calories: 350, fixed_protein: 35, fixed_carbs: 40, fixed_fat: 5, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Low Carb Patinho & Brócolis', fixed_calories: 280, fixed_protein: 40, fixed_carbs: 10, fixed_fat: 8, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Veggie Grão de Bico & Arroz Integral', fixed_calories: 420, fixed_protein: 15, fixed_carbs: 65, fixed_fat: 10, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Peixe & Vegetais Assados', fixed_calories: 310, fixed_protein: 30, fixed_carbs: 25, fixed_fat: 12, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Hipertrofia Macarrão & Carne Moída', fixed_calories: 550, fixed_protein: 45, fixed_carbs: 70, fixed_fat: 10, is_active: true }
    ];

    const { count: marmitaCount } = await supabase.from('meal_recipes').select('*', { count: 'exact', head: true }).eq('nutritionist_id', nutritionistId);
    if (marmitaCount === 0) {
      console.log('[Seed] Inserindo marmitas base...');
      await supabase.from('meal_recipes').insert(baseMarmitas);
    }

    // 3. Templates Base
    const baseTemplates = [
      { nutritionist_id: nutritionistId, name: 'Café da Manhã Clássico', goal_tags: ['Manutenção', 'Equilíbrio'], foods_structure: [
        { name: 'Pão de Forma Integral', kcal: 120, protein: 9, carbs: 22, fat: 3, portion: '2 fatias' },
        { name: 'Ovo de Galinha Cozido', kcal: 150, protein: 12, carbs: 1, fat: 10, portion: '2 unidades' }
      ]},
      { nutritionist_id: nutritionistId, name: 'Almoço Performance', goal_tags: ['Hipertrofia', 'Energia'], foods_structure: [
        { name: 'Arroz Branco Cozido', kcal: 195, protein: 4, carbs: 42, fat: 0, portion: '150g' },
        { name: 'Feijão Carioca Cozido', kcal: 76, protein: 5, carbs: 14, fat: 0, portion: '100g' },
        { name: 'Peito de Frango Grelhado', kcal: 247, protein: 46, carbs: 0, fat: 5, portion: '150g' }
      ]},
      { nutritionist_id: nutritionistId, name: 'Lanche Prático', goal_tags: ['Praticidade', 'Saciedade'], foods_structure: [
        { name: 'Iogurte Natural Integral', kcal: 100, protein: 6, carbs: 8, fat: 5, portion: '170g' },
        { name: 'Aveia em Flocos', kcal: 115, protein: 5, carbs: 20, fat: 2, portion: '30g' }
      ]},
      { nutritionist_id: nutritionistId, name: 'Jantar Leve', goal_tags: ['Cutting', 'Sono'], foods_structure: [
        { name: 'Filé de Tilápia Grelhado', kcal: 130, protein: 26, carbs: 0, fat: 3, portion: '100g' },
        { name: 'Brócolis Cozido', kcal: 35, protein: 3, carbs: 7, fat: 0, portion: '100g' }
      ]},
      { nutritionist_id: nutritionistId, name: 'Pré-Treino Explosivo', goal_tags: ['Performance', 'Foco'], foods_structure: [
        { name: 'Banana Nanica', kcal: 90, protein: 1, carbs: 23, fat: 0, portion: '1 unidade' },
        { name: 'Aveia em Flocos', kcal: 115, protein: 5, carbs: 20, fat: 2, portion: '30g' }
      ]}
    ];

    const { count: templateCount } = await supabase.from('nutritionist_meal_templates').select('*', { count: 'exact', head: true });
    if (templateCount === 0) {
      console.log('[Seed] Inserindo templates base...');
      await supabase.from('nutritionist_meal_templates').insert(baseTemplates);
    }

    return true;
  } catch (err) {
    console.error('[Seed] Erro crítico no Auto-Seed:', err);
    return false;
  }
};