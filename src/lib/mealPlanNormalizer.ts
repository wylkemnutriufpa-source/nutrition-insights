
export interface NormalizedMealPlan {
  id: string;
  meals: NormalizedMeal[];
}

export interface NormalizedMeal {
  id: string;
  name: string;
  day_of_week: number;
  items: NormalizedItem[];
  time?: string;
}

export interface NormalizedItem {
  id: string;
  title: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string | null;
  image_url?: string | null;
  display_quantity?: string | number;
  display_unit?: string;
  clinical_mass_g?: number;
  substitution_group_id?: string | null;
  is_primary?: boolean;
  metadata?: Record<string, any> | null;
}

const TYPE_MAP: Record<string, string> = {
  "breakfast": "Café da Manhã",
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
  const lower = type.toLowerCase();
  return TYPE_MAP[lower] || type;
}

export function normalizeMealPlan(rawData: any): NormalizedMealPlan {
  if (!rawData) return { id: 'unknown', meals: [] };

  const snapshot = rawData.snapshot || rawData.items_payload || (rawData.meals ? rawData : {});
  const rawMeals: any[] = [];
  
  // 1. SOBERANIA V3: Estrutura oficial por dias
  if (snapshot && Array.isArray(snapshot.days)) {
    snapshot.days.forEach((day: any) => {
      const dayIdx = day.day_of_week !== undefined && day.day_of_week !== null ? Number(day.day_of_week) : 0;
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
  // 2. COMPATIBILIDADE V2: Lista de refeições direta no snapshot
  else if (snapshot && Array.isArray(snapshot.meals)) {
    rawMeals.push(...snapshot.meals);
  }
  // 3. FALLBACK DE EMERGÊNCIA: Snapshot é um objeto de refeição única ou lista de itens plana
  else if (snapshot && (snapshot.items || snapshot.meal_type || snapshot.name)) {
    rawMeals.push({
      ...snapshot,
      name: snapshot.name || snapshot.meal_type || 'Refeição',
      day_of_week: snapshot.day_of_week || 0,
      items: Array.isArray(snapshot.items) ? snapshot.items : []
    });
  }

  // 4. ÚLTIMO RECURSO: Se o snapshot falhou, mas temos itens relacionais (RPC or regular fetch)
  if (rawMeals.length === 0 && Array.isArray(rawData.items) && rawData.items.length > 0) {
    const groups = new Map();
    rawData.items.forEach((it: any) => {
      const day = it.day_of_week !== null && it.day_of_week !== undefined ? it.day_of_week : 0;
      const type = it.tipo_refeicao || 'Refeição';
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

  const meals = rawMeals.map((m: any) => {
    const mealName = m.name || translateType(m.meal_type || m.type || m.tipo_refeicao);
    
    return {
      id: m.id || Math.random().toString(),
      name: mealName,
      time: m.time || m.scheduled_time || "08:00",
      day_of_week: m.day_of_week !== undefined && m.day_of_week !== null ? Number(m.day_of_week) : 0,
      items: (m.items || []).map((it: any) => {
        // Resolve a imagem de qualquer lugar possível no objeto
        const img = it.image_url || it.imageUrl || it.visual?.image_url || it.metadata?.image_url || it.metadata?.imageUrl || it.edit_metadata?.image_url;
        
        // Resolve macros de qualquer esquema possível (v2, v3, snapshot, rpc)
        const kcal = Number(it.meta_calorias ?? it.kcal ?? it.calories ?? it.macros?.kcal ?? 0);
        const prot = Number(it.meta_proteinas ?? it.protein ?? it.macros?.protein_g ?? 0);
        const carb = Number(it.meta_carboidratos ?? it.carbs ?? it.macros?.carbs_g ?? 0);
        const fat = Number(it.meta_gorduras ?? it.fat ?? it.macros?.fat_g ?? 0);

        return {
          id: it.id || it.instanceId || Math.random().toString(),
          title: it.title || it.name || "Refeição",
          description: it.description || it.instructions || "",
          calories: kcal,
          protein: prot,
          carbs: carb,
          fat: fat,
          imageUrl: img,
          image_url: img,
          display_quantity: it.display_quantity || it.quantity_display || it.quantity,
          display_unit: it.display_unit || it.unit || it.portionUnitLabel,
          clinical_mass_g: it.clinical_mass_g || it.grams,
          substitution_group_id: it.substitution_group_id || it.blockId,
          is_primary: it.is_primary ?? true,
          metadata: it.metadata || it.edit_metadata || it.macros || {}
        };
      })
    };
  });

  return { id: rawData.id || 'unknown', meals };
}
