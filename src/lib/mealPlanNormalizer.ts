
export interface NormalizedMealPlan {
  id: string;
  meals: NormalizedMeal[];
}

export interface NormalizedMeal {
  id: string;
  name: string;
  day_of_week?: number;
  items: NormalizedItem[];
  time?: string;
  icon?: string;
  description?: string;
  imageUrl?: string;
}

export interface NormalizedItem {
  id: string;
  instanceId: string; 
  name: string;      
  title: string;     
  description: string;
  kcal: number;      
  calories: number;  
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;  
  display_quantity?: string | number;
  display_unit?: string;
  clinical_mass_g?: number;
  imageUrl?: string | null;
  image_url?: string | null;
  substitution_group_id?: string | null;
  blockId?: string | null;
  is_primary?: boolean;
  substitutions: any[]; 
  metadata?: Record<string, any> | null;
  instructions?: string;
}

const TYPE_MAP: Record<string, string> = {
  "breakfast": "Café da Manhã",
  "cafe": "Café da Manhã",
  "cafe_da_manha": "Café da Manhã",
  "morning_snack": "Lanche da Manhã",
  "lanche_da_manha": "Lanche da Manhã",
  "lunch": "Almoço",
  "almoco": "Almoço",
  "afternoon_snack": "Lanche da Tarde",
  "lanche_da_tarde": "Lanche da Tarde",
  "dinner": "Jantar",
  "jantar": "Jantar",
  "evening_snack": "Ceia",
  "ceia": "Ceia",
  "snack": "Lanche",
  "pre_workout": "Pré-Treino",
  "post_workout": "Pós-Treino"
};

function translateType(type: string | undefined): string {
  if (!type) return "Refeição";
  const lower = type.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '_');
  return TYPE_MAP[lower] || type;
}

function normalizeItem(it: any): NormalizedItem {
  const img = it.image_url || it.imageUrl || it.visual?.image_url || it.metadata?.image_url || it.metadata?.imageUrl || it.edit_metadata?.image_url;
  
  const kcal = Number(it.kcal ?? it.meta_calorias ?? it.calories ?? it.macros?.kcal ?? 0);
  const prot = Number(it.protein ?? it.meta_proteinas ?? it.macros?.protein_g ?? 0);
  const carb = Number(it.carbs ?? it.meta_carboidratos ?? it.macros?.carbs_g ?? 0);
  const fat = Number(it.fat ?? it.meta_gorduras ?? it.macros?.fat_g ?? 0);

  const qty = Number(it.quantity ?? it.display_quantity ?? it.clinical_mass_g ?? 0);

  return {
    id: it.id || it.instanceId || Math.random().toString(),
    instanceId: it.instanceId || it.id || Math.random().toString(),
    name: it.name || it.title || "Refeição",
    title: it.title || it.name || "Refeição",
    description: it.description || it.instructions || "",
    instructions: it.instructions || it.description || "",
    kcal: kcal,
    calories: kcal,
    protein: prot,
    carbs: carb,
    fat: fat,
    quantity: qty,
    display_quantity: it.display_quantity || it.quantity_display || qty || "",
    display_unit: it.display_unit || it.unit || it.portionUnitLabel || "g",
    clinical_mass_g: it.clinical_mass_g || it.grams || qty,
    imageUrl: img,
    image_url: img,
    substitution_group_id: it.substitution_group_id || it.blockId,
    blockId: it.blockId || it.substitution_group_id,
    is_primary: it.is_primary ?? true,
    substitutions: Array.isArray(it.substitutions) ? it.substitutions.map((s: any) => normalizeItem(s)) : [],
    metadata: it.metadata || it.edit_metadata || it.macros || {}
  };
}

export function normalizeMealPlan(rawData: any): NormalizedMealPlan {
  if (!rawData) return { id: 'unknown', meals: [] };

  const snapshot = rawData.snapshot || rawData.items_payload || (rawData.meals ? rawData : null);
  const rawMeals: any[] = [];
  
  // 1. Prioridade Soberana: Snapshot V3 (days structure)
  if (snapshot && Array.isArray(snapshot.days)) {
    snapshot.days.forEach((day: any, index: number) => {
      const daysOrder = [1, 2, 3, 4, 5, 6, 0];
      const fallbackDay = daysOrder[index % 7];
      const dayIdx = (day.day_of_week !== undefined && day.day_of_week !== null) ? Number(day.day_of_week) : fallbackDay;

      if (Array.isArray(day.meals)) {
        day.meals.forEach((m: any) => {
          rawMeals.push({
            ...m,
            day_of_week: dayIdx
          });
        });
      }
    });
  } 
  // 2. Snapshot V3 Flat Structure
  else if (snapshot && Array.isArray(snapshot.meals)) {
    rawMeals.push(...snapshot.meals);
  }
  // 3. Fallback: Meal Plan Items (from database table or RPC result)
  const itemsSource = rawData.meal_plan_items || rawData.items || (Array.isArray(rawData) ? rawData : []);
  
  if (rawMeals.length === 0 && Array.isArray(itemsSource) && itemsSource.length > 0) {
    const groups = new Map();
    itemsSource.forEach((it: any) => {
      if (!it) return;
      const day = it.day_of_week !== null && it.day_of_week !== undefined ? it.day_of_week : 0;
      const type = it.tipo_refeicao || it.meal_type || 'Refeição';
      const key = `${day}-${type}`;
      
      if (!groups.has(key)) {
        groups.set(key, { 
          id: `group-${key}`,
          name: translateType(type),
          day_of_week: day,
          items: [] 
        });
      }
      groups.get(key).items.push(it);
    });
    rawMeals.push(...Array.from(groups.values()));
  }

  // Final mapping to Normalized structure
  const meals = rawMeals.map((m: any) => {
    const mealName = m.name || translateType(m.meal_type || m.type || m.tipo_refeicao);
    
    return {
      id: m.id || Math.random().toString(),
      name: mealName,
      time: m.time || m.scheduled_time || "08:00",
      day_of_week: m.day_of_week !== undefined && m.day_of_week !== null ? Number(m.day_of_week) : 0,
      items: (m.items || []).map((it: any) => normalizeItem(it))
    };
  });

  return { id: rawData.id || 'unknown', meals };
}
