import { supabase } from "@/integrations/supabase/client";
import { Food, MealTemplate } from "../types";

const normalize = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
};

const isWholeWordMatch = (text: string, keyword: string): boolean => {
  const regex = new RegExp(`\\b${keyword}\\b`, 'i');
  return regex.test(text);
};

const findBestVisual = async (foodName: string): Promise<string | undefined> => {
  const norm = normalize(foodName);
  
  // 1. Try exact alias match (Priority 1)
  const { data: aliasData } = await supabase
    .from("meal_visual_aliases" as any)
    .select("library_item_id")
    .eq("normalized_alias", norm)
    .maybeSingle();

  if (aliasData) {
    const { data: item } = await supabase
      .from("meal_visual_library")
      .select("image_url")
      .eq("id", (aliasData as any).library_item_id)
      .maybeSingle();
    if (item?.image_url) return item.image_url;
  }

  // 2. Try exact name match in library (Priority 2)
  const { data: libraryData } = await supabase
    .from("meal_visual_library")
    .select("image_url")
    .ilike("name", foodName)
    .is("nutritionist_id", null) // Prioritize system images for auto-match to avoid randomness
    .limit(1)
    .maybeSingle();

  if (libraryData?.image_url) return libraryData.image_url;

  // 3. Try keywords with whole-word matching (Priority 3)
  const keywords = norm.split(' ');
  const importantKeywords = keywords.filter(k => k.length > 3 && !['com', 'para', 'sem'].includes(k));
  
  if (importantKeywords.length > 0) {
    for (const kw of importantKeywords) {
      const { data: kwMatches } = await supabase
        .from("meal_visual_library")
        .select("image_url, name")
        .ilike("name", `%${kw}%`)
        .is("nutritionist_id", null)
        .limit(5);
      
      if (kwMatches && kwMatches.length > 0) {
        const bestKwMatch = kwMatches.find(m => isWholeWordMatch(m.name, kw));
        if (bestKwMatch?.image_url) return bestKwMatch.image_url;
      }
    }
  }

  return undefined;
};

export const searchFoods = async (query: string): Promise<Food[]> => {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from("food_database")
    .select("*")
    .ilike("name", `%${query}%`)
    .limit(50);

  if (error) {
    console.error("Error searching foods:", error);
    return [];
  }

  // Fetch visuals in parallel for better performance
  const foods = await Promise.all((data || []).map(async (f: any) => {
    const imageUrl = await findBestVisual(f.name);
    
    return {
      id: f.id,
      name: f.name,
      kcal: f.calories,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      portionValue: 100, // No V3, a base é 100 para alimentos em gramas
      portionUnitLabel: "g",
      portionUnit: "g",
      portionLabel: "100g",
      measurementType: "gram",
      imageUrl: imageUrl || undefined
    };
  }));

  return foods as Food[];
};

export const searchVisualLibrary = async (
  query: string, 
  category?: string, 
  nutritionistId?: string | null
): Promise<{ items: Food[], categoryCount?: number, incomplete?: boolean }> => {
  let queryBuilder = supabase
    .from("meal_visual_library")
    .select("*", { count: 'exact' })
    .eq("is_active", true);

  if (nutritionistId) {
    queryBuilder = queryBuilder.or(`nutritionist_id.is.null,nutritionist_id.eq.${nutritionistId}`);
  } else {
    queryBuilder = queryBuilder.is("nutritionist_id", null);
  }

  if (category && category !== 'all') {
    queryBuilder = queryBuilder.eq("category", category);
  }

  if (query && query.length >= 2) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,display_name.ilike.%${query}%`);
  }

  const { data, error, count } = await queryBuilder.limit(40);

  if (error) {
    console.error("Error searching visual library:", error);
    return { items: [] };
  }

  const items = (data || []).map((v: any) => ({
    id: v.id,
    name: v.display_name || v.name,
    kcal: v.default_calories || 0,
    calories: v.default_calories || 0,
    protein: v.default_protein || 0,
    carbs: v.default_carbs || 0,
    fat: v.default_fat || 0,
    portionValue: 1,
    portionUnitLabel: v.default_portion?.includes("g") ? "g" : (v.default_portion?.includes("ml") ? "ml" : "unidade"),
    portionUnit: v.default_portion?.includes("g") ? "g" : (v.default_portion?.includes("ml") ? "ml" : "unidade"),
    portionLabel: v.default_portion || "1 porção",
    measurementType: v.default_portion?.includes("g") ? "gram" : (v.default_portion?.includes("ml") ? "ml" : "unit") as any,
    imageUrl: v.image_url || undefined,
    category: v.category,
    isVisualLibraryItem: true,
    nutritionistId: v.nutritionist_id
  }));

  // Fail-Safe Validation
  let incomplete = false;
  if (category && category !== 'all') {
    const minNeeded: Record<string, number> = {
      'cafe_da_manha': 5,
      'almoco': 5,
      'jantar': 5,
      'lanches': 3
    };
    if (count !== null && count < (minNeeded[category] || 0)) {
      incomplete = true;
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[VisualLibrary] ${items.length} imagens carregadas para categoria: ${category || 'all'}`);
  }

  return { items, categoryCount: count || 0, incomplete };
};

export const uploadVisualLibraryImage = async (
  file: File, 
  name: string, 
  category: string, 
  nutritionistId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `visual-library/${nutritionistId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('meal-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('meal-images')
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase
      .from('meal_visual_library')
      .insert(({
        name,
        display_name: name,
        category,
        image_url: publicUrl,
        nutritionist_id: nutritionistId,
        is_active: true
      } as any));

    if (insertError) throw insertError;

    return { success: true };
  } catch (err: any) {
    console.error('Error uploading image:', err);
    return { success: false, error: err.message };
  }
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

  return (data || []).map((r: any) => {
    // Cálculo de fallback se os macros fixos forem zero ou nulos
    const kcal = r.fixed_calories || 0;
    const protein = r.fixed_protein || 0;
    const carbs = r.fixed_carbs || 0;
    const fat = r.fixed_fat || 0;

    return {
      id: r.id,
      name: r.name,
      kcal,
      calories: kcal,
      protein,
      carbs,
      fat,
      portionValue: 1,
      portionUnitLabel: "marmita",
      portionUnit: "marmita",
      portionLabel: "1 marmita",
      measurementType: "unit",
      isMarmita: true,
      locked: false, 
      imageUrl: r.image_url || undefined,
      ingredients: r.foods_json || [],
      instructions: r.instructions || ""
    };
  });
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

export const getCompatibleFoods = async (
  category: 'protein' | 'carb' | 'fruit' | 'any', 
  currentName: string,
  restrictions: string[] = []
): Promise<Food[]> => {
  let query = supabase.from("food_database").select("*");
  
  if (category === 'protein') {
    query = query.or('name.ilike.%frango%,name.ilike.%carne%,name.ilike.%peixe%,name.ilike.%ovo%,name.ilike.%whey%,name.ilike.%patinho%,name.ilike.%queijo%');
  } else if (category === 'carb') {
    query = query.or('name.ilike.%arroz%,name.ilike.%batata%,name.ilike.%macarrão%,name.ilike.%feijão%,name.ilike.%pão%,name.ilike.%aveia%,name.ilike.%tapioca%');
  } else if (category === 'fruit') {
    query = query.or('name.ilike.%banana%,name.ilike.%maçã%,name.ilike.%uva%,name.ilike.%laranja%,name.ilike.%mamão%,name.ilike.%abacaxi%');
  }

  const { data, error } = await query.neq('name', currentName).limit(30);

  if (error) {
    console.error("Error fetching compatible foods:", error);
    return [];
  }

  // Engine Adaptativa: Filtrar restrições
  const filteredData = (data || []).filter(f => 
    !restrictions.some(r => f.name.toLowerCase().includes(r.toLowerCase()))
  );

  return filteredData.map((f: any) => ({
    id: f.id,
    name: f.name,
    kcal: f.calories,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    portionValue: 100,
    portionUnitLabel: "g",
    portionUnit: "g",
    portionLabel: "100g",
    measurementType: "gram",
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
    portionValue: 100,
    portionUnitLabel: "g",
    portionUnit: "g",
    portionLabel: "100g",
    measurementType: "gram",
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
    if (foodCount < 40) {
      console.log('[Seed] Inserindo alimentos essenciais...');
      const extendedFoods = [
        ...essentialFoods,
        { name: 'Aveia em Flocos', calories: 389, protein: 17, carbs: 66, fat: 7, serving_size: '100g' },
        { name: 'Pasta de Amendoim', calories: 588, protein: 25, carbs: 20, fat: 50, serving_size: '100g' },
        { name: 'Iogurte Grego', calories: 133, protein: 10, carbs: 4, fat: 9, serving_size: '100g' },
        { name: 'Pão Francês', calories: 300, protein: 9, carbs: 58, fat: 3, serving_size: '100g' },
        { name: 'Mamão Papaia', calories: 43, protein: 0.5, carbs: 11, fat: 0.3, serving_size: '100g' },
        { name: 'Abacaxi Pérola', calories: 50, protein: 0.5, carbs: 13, fat: 0.1, serving_size: '100g' },
        { name: 'Uva Niágara', calories: 67, protein: 0.6, carbs: 17, fat: 0.4, serving_size: '100g' },
        { name: 'Melancia', calories: 30, protein: 0.6, carbs: 7.5, fat: 0.2, serving_size: '100g' },
        { name: 'Quinoa Cozida', calories: 120, protein: 4.4, carbs: 21, fat: 1.9, serving_size: '100g' },
        { name: 'Laranja Pêra', calories: 47, protein: 0.9, carbs: 12, fat: 0.1, serving_size: '100g' },
        { name: 'Cenoura Cozida', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, serving_size: '100g' },
        { name: 'Castanha do Pará', calories: 656, protein: 14, carbs: 12, fat: 66, serving_size: '100g' },
        { name: 'Filé de Salmão Grelhado', calories: 208, protein: 20, carbs: 0, fat: 13, serving_size: '100g' },
        { name: 'Macarrão Integral Cozido', calories: 124, protein: 5.3, carbs: 26, fat: 0.5, serving_size: '100g' },
        { name: 'Feijão Preto Cozido', calories: 132, protein: 8.9, carbs: 24, fat: 0.5, serving_size: '100g' }
      ];
      await supabase.from('food_database').insert(extendedFoods);
    }

    // 2. Marmitas Base
    const baseMarmitas = [
      { nutritionist_id: nutritionistId, name: 'Marmita Fit Frango & Batata Doce', fixed_calories: 350, fixed_protein: 35, fixed_carbs: 40, fixed_fat: 5, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Low Carb Patinho & Brócolis', fixed_calories: 280, fixed_protein: 40, fixed_carbs: 10, fixed_fat: 8, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Veggie Grão de Bico & Arroz Integral', fixed_calories: 420, fixed_protein: 15, fixed_carbs: 65, fixed_fat: 10, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Peixe & Vegetais Assados', fixed_calories: 310, fixed_protein: 30, fixed_carbs: 25, fixed_fat: 12, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Hipertrofia Macarrão & Carne Moída', fixed_calories: 550, fixed_protein: 45, fixed_carbs: 70, fixed_fat: 10, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Salmão & Quinoa', fixed_calories: 450, fixed_protein: 35, fixed_carbs: 35, fixed_fat: 18, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Frango Curry & Arroz Basmati', fixed_calories: 380, fixed_protein: 32, fixed_carbs: 45, fixed_fat: 7, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Omelete de Forno & Salada', fixed_calories: 250, fixed_protein: 20, fixed_carbs: 8, fixed_fat: 15, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Escondidinho de Mandioca & Carne', fixed_calories: 480, fixed_protein: 30, fixed_carbs: 55, fixed_fat: 14, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Bowl de Atum & Grãos', fixed_calories: 320, fixed_protein: 28, fixed_carbs: 30, fixed_fat: 9, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Panqueca Integral de Frango', fixed_calories: 400, fixed_protein: 35, fixed_carbs: 40, fixed_fat: 10, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Lasanha de Berinjela', fixed_calories: 290, fixed_protein: 22, carbs: 15, fat: 12, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Frango desfiado com Milho', fixed_calories: 340, fixed_protein: 38, carbs: 25, fat: 8, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Risoto de Alho Poró & Tilápia', fixed_calories: 370, fixed_protein: 28, carbs: 45, fat: 6, is_active: true },
      { nutritionist_id: nutritionistId, name: 'Marmita Almôndegas de Frango & Purê de Abóbora', fixed_calories: 310, fixed_protein: 30, carbs: 20, fat: 10, is_active: true }
    ];

    const { count: marmitaCount } = await supabase.from('meal_recipes').select('*', { count: 'exact', head: true }).eq('nutritionist_id', nutritionistId);
    if (marmitaCount < 10) {
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
      ]},
      { nutritionist_id: nutritionistId, name: 'Café da Manhã Energético', goal_tags: ['Energia', 'Manhã'], foods_structure: [
        { name: 'Tapioca (Goma)', kcal: 240, protein: 0, carbs: 60, fat: 0, portion: '100g' },
        { name: 'Ovo de Galinha Cozido', kcal: 155, protein: 13, carbs: 1, fat: 11, portion: '2 unidades' }
      ]},
      { nutritionist_id: nutritionistId, name: 'Shake de Whey & Aveia', goal_tags: ['Pós-Treino', 'Rápido'], foods_structure: [
        { name: 'Whey Protein Isolar', kcal: 111, protein: 24, carbs: 2, fat: 1, portion: '30g' },
        { name: 'Aveia em Flocos', kcal: 115, protein: 5, carbs: 20, fat: 2, portion: '30g' },
        { name: 'Banana Nanica', kcal: 92, protein: 1, carbs: 24, fat: 0, portion: '1 unidade' }
      ]},
      { nutritionist_id: nutritionistId, name: 'Lanche Low Carb', goal_tags: ['Low Carb', 'Saciedade'], foods_structure: [
        { name: 'Queijo Cottage', kcal: 98, protein: 11, carbs: 3, fat: 4, portion: '100g' },
        { name: 'Amendoim Torrado', kcal: 170, protein: 8, carbs: 5, fat: 15, portion: '30g' }
      ]},
      { nutritionist_id: nutritionistId, name: 'Almoço Veggie Fit', goal_tags: ['Veggie', 'Leve'], foods_structure: [
        { name: 'Feijão Carioca Cozido', kcal: 76, protein: 5, carbs: 14, fat: 0, portion: '100g' },
        { name: 'Arroz Branco Cozido', kcal: 130, protein: 2, carbs: 28, fat: 0, portion: '100g' },
        { name: 'Brócolis Cozido', kcal: 34, protein: 3, carbs: 7, fat: 0, portion: '100g' }
      ]},
      { nutritionist_id: nutritionistId, name: 'Jantar Proteico', goal_tags: ['Massa Magra', 'Noite'], foods_structure: [
        { name: 'Patinho Moído Grelhado', kcal: 219, protein: 36, carbs: 0, fat: 7, portion: '100g' },
        { name: 'Alface Crespa', kcal: 15, protein: 1, carbs: 3, fat: 0, portion: '100g' },
        { name: 'Tomate Italiano', kcal: 18, protein: 1, carbs: 4, fat: 0, portion: '100g' }
      ]}
    ];

    const { count: templateCount } = await supabase.from('nutritionist_meal_templates').select('*', { count: 'exact', head: true });
    if (templateCount < 10) {
      console.log('[Seed] Inserindo ou complementando templates base...');
      await supabase.from('nutritionist_meal_templates').insert(baseTemplates);
    }

    return true;
  } catch (err) {
    console.error('[Seed] Erro crítico no Auto-Seed:', err);
    return false;
  }
};