import { FOOD_DATABASE } from "@/components/meals/FoodAutocomplete";
import type { Tables } from "@/integrations/supabase/types";

type MealPlanItem = Tables<"meal_plan_items">;

const SUB_TOLERANCE = { 
  kcalPct: 0.12,    // 12% tolerance for calories
  proteinPct: 0.20, // 20% tolerance for protein
  carbsPct: 0.20,   // 20% tolerance for carbs
  fatPct: 0.25      // 25% tolerance for fat
};

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function parseFoodNutrition(text: string) {
  const n = normalize(text);
  
  // Try to find match in database
  // We look for the longest match to be more specific
  let bestMatch = null;
  let maxLen = 0;

  for (const food of FOOD_DATABASE) {
    const fn = normalize(food.name);
    if ((n.includes(fn) || fn.includes(n)) && fn.length > maxLen) {
      bestMatch = food;
      maxLen = fn.length;
    }
  }

  return bestMatch;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateMealSubstitutions(item: MealPlanItem, maxCount: number = 4): ValidationResult {
  const meta = (item as any).edit_metadata || (item as any).metadata || {};
  const substitutions = meta.substitutions_json as string[];
  
  if (!substitutions || !Array.isArray(substitutions) || substitutions.length === 0) {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];

  if (substitutions.length > maxCount) {
    errors.push(`A refeição tem ${substitutions.length} substituições, mas o limite definido é ${maxCount}.`);
  }

  const mainKcal = Number(item.calories_target) || 0;
  const mainProtein = Number(item.protein_target) || 0;
  const mainCarbs = Number(item.carbs_target) || 0;
  const mainFat = Number(item.fat_target) || 0;

  // We only validate if main meal has macros defined
  if (mainKcal === 0) return { valid: true, errors: [] };

  substitutions.forEach((sub, idx) => {
    // Extract part after arrow if present
    const parts = sub.split("→");
    const subContent = parts[1] || parts[0] || "";
    
    // Check if there are multiple comma-separated foods in one line
    const individualFoods = subContent.split(",").map(f => f.trim());

    individualFoods.forEach(foodText => {
      const foodMatch = parseFoodNutrition(foodText);
      
      if (foodMatch) {
        const kcalDiff = Math.abs(foodMatch.calories - mainKcal) / mainKcal;
        const protDiff = mainProtein > 2 ? Math.abs(foodMatch.protein - mainProtein) / mainProtein : 0;
        const carbDiff = mainCarbs > 2 ? Math.abs(foodMatch.carbs - mainCarbs) / mainCarbs : 0;

        if (kcalDiff > SUB_TOLERANCE.kcalPct) {
          errors.push(`Substituição ${idx + 1}: "${foodMatch.name}" (${foodMatch.calories} kcal) está fora da tolerância de ±12% em relação à principal (${mainKcal} kcal).`);
        } else if (protDiff > SUB_TOLERANCE.proteinPct) {
          errors.push(`Substituição ${idx + 1}: "${foodMatch.name}" (${foodMatch.protein}g P) está fora da tolerância de ±20% de proteína (${mainProtein}g P).`);
        } else if (carbDiff > SUB_TOLERANCE.carbsPct) {
          errors.push(`Substituição ${idx + 1}: "${foodMatch.name}" (${foodMatch.carbs}g C) está fora da tolerância de ±20% de carboidratos (${mainCarbs}g C).`);
        }
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validatePlanSubstitutions(items: MealPlanItem[], maxCount: number = 4): ValidationResult {
  const allErrors: string[] = [];
  
  items.forEach(item => {
    const result = validateMealSubstitutions(item, maxCount);
    if (!result.valid) {
      allErrors.push(`[${item.title}] ${result.errors.join(" | ")}`);
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}
