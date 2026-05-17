import { getHardcodedImageUrl } from "./mealVisualMatcher";

export interface NormalizedMealPlan {
  id: string;
  meals: NormalizedMeal[];
}

export interface NormalizedMeal {
  id: string;
  name: string;
  day_of_week: number;
  items: NormalizedItem[];
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
  display_quantity?: string | number;
  display_unit?: string;
  metadata?: Record<string, any> | null;
}

const TYPE_MAP: Record<string, string> = {
  "breakfast": "Café da Manhã",
  "morning_snack": "Lanche da Manhã",
  "lunch": "Almoço",
  "afternoon_snack": "Lanche da Tarde",
  "dinner": "Jantar",
  "evening_snack": "Ceia"
};

function translateType(type: string | undefined): string {
  if (!type) return "Outros";
  return TYPE_MAP[type.toLowerCase()] || type;
}

export function normalizeMealPlan(rawData: any): NormalizedMealPlan {
  if (!rawData) return { id: 'unknown', meals: [] };

  const snapshot = rawData.snapshot || {};
  
  // SOBERANIA V3: Handle both direct meals array and day-based nested meals
  const rawMeals: any[] = [];
  
  if (Array.isArray(snapshot.meals)) {
    rawMeals.push(...snapshot.meals);
  } else if (Array.isArray(snapshot.days)) {
    snapshot.days.forEach((day: any) => {
      const dayMeals = (day.meals || []).map((m: any) => ({
        ...m,
        day_of_week: m.day_of_week ?? day.day_of_week ?? 1
      }));
      rawMeals.push(...dayMeals);
    });
  }

  const meals = rawMeals.map((m: any) => ({
    id: m.id || Math.random().toString(),
    name: m.name || translateType(m.meal_type || m.type),
    day_of_week: m.day_of_week ?? 1,
    items: (m.items || []).map((it: any) => {
      // 🛡️ SOBERANIA V3: Estabilização de Imagem - Garantir que imageUrl nunca seja perdido
      const rawImg = it.imageUrl || it.image_url || it.metadata?.image_url || it.metadata?.imageUrl || it.edit_metadata?.image_url;
      
      return {
        id: it.id || it.instanceId || Math.random().toString(),
        title: it.title || it.name || "Refeição",
        description: it.description || it.instructions || "",
        calories: Number(it.meta_calorias ?? it.kcal ?? it.calories ?? it.macros?.kcal ?? 0),
        protein: Number(it.meta_proteinas ?? it.protein ?? it.macros?.protein_g ?? 0),
        carbs: Number(it.meta_carboidratos ?? it.carbs ?? it.macros?.carbs_g ?? 0),
        fat: Number(it.meta_gorduras ?? it.fat ?? it.macros?.fat_g ?? 0),
        imageUrl: rawImg || getHardcodedImageUrl(it.title || it.name || ""),
        display_quantity: it.display_quantity || it.quantity,
        display_unit: it.display_unit || it.unit,
        metadata: it.metadata || it.edit_metadata || {}
      };
    })
  }));

  return { id: rawData.id, meals };
}
