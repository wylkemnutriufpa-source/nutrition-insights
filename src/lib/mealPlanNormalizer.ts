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
  const lower = type.toLowerCase();
  return TYPE_MAP[lower] || type;
}

function isPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  // SOBERANIA V3: Detectamos Unsplash como placeholder para forçar substituição pela biblioteca real
  return url.includes("unsplash.com") || url.includes("placeholder.svg") || url.includes("via.placeholder") || url.includes("images.unsplash.com");
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
      // Garantir que o dia da semana seja propagado corretamente para as refeições
      // Sunday must be 0, Monday 1, etc.
      const dayIdx = day.day_of_week !== undefined && day.day_of_week !== null ? Number(day.day_of_week) : (day.day !== undefined ? Number(day.day) : 0);
      
      const dayMeals = (day.meals || []).map((m: any) => ({
        ...m,
        day_of_week: m.day_of_week !== undefined && m.day_of_week !== null ? Number(m.day_of_week) : dayIdx
      }));
      rawMeals.push(...dayMeals);
    });
  }

  const meals = rawMeals.map((m: any) => {
    const mealName = m.name || translateType(m.meal_type || m.type);
    
    return {
      id: m.id || Math.random().toString(),
      name: mealName,
      day_of_week: m.day_of_week !== undefined && m.day_of_week !== null ? Number(m.day_of_week) : 0,
      items: (m.items || []).map((it: any) => {
        // 🛡️ SOBERANIA V3: Estabilização de Imagem - PRIORIDADE TOTAL PARA BIBLIOTECA REAL
        // Se a imagem no snapshot for nula ou for um placeholder (Unsplash), buscamos na biblioteca local.
        const originalImg = it.imageUrl || it.image_url || it.metadata?.image_url || it.metadata?.imageUrl || it.edit_metadata?.image_url;
        
        // Sempre tentamos encontrar uma imagem melhor na biblioteca real se a atual for placeholder
        let finalImg = originalImg;
        if (isPlaceholderUrl(originalImg)) {
          const matchedImg = getHardcodedImageUrl(it.title || it.name || "");
          if (matchedImg) {
            finalImg = matchedImg;
          }
        }
        
        return {
          id: it.id || it.instanceId || Math.random().toString(),
          title: it.title || it.name || "Refeição",
          description: it.description || it.instructions || "",
          calories: Number(it.meta_calorias ?? it.kcal ?? it.calories ?? it.macros?.kcal ?? 0),
          protein: Number(it.meta_proteinas ?? it.protein ?? it.macros?.protein_g ?? 0),
          carbs: Number(it.meta_carboidratos ?? it.carbs ?? it.macros?.carbs_g ?? 0),
          fat: Number(it.meta_gorduras ?? it.fat ?? it.macros?.fat_g ?? 0),
          imageUrl: finalImg,
          display_quantity: it.display_quantity || it.quantity,
          display_unit: it.display_unit || it.unit,
          metadata: it.metadata || it.edit_metadata || {}
        };
      })
    };
  });

  return { id: rawData.id, meals };
}
