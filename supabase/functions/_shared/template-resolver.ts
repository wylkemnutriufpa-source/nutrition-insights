/**
 * Template Resolver Engine v1.0.0
 * Resolves meal templates from nutritionist_meal_templates for the Clinical Nutrition Engine.
 * Primary source for meal generation; visual library is the fallback.
 */

export interface ResolvedTemplate {
  id: string;
  name: string;
  meal_type: string;
  kcal_base: number;
  protein_base: number;
  carbs_base: number;
  fat_base: number;
  foods_structure: FoodStructureItem[];
  satiety_score: number;
  complexity_level: string;
  goal_tags: string[];
  nutritionist_id: string;
  is_global: boolean;
}

export interface FoodStructureItem {
  name: string;
  portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  protein_per_gram?: number;
  carbs_per_gram?: number;
  fat_per_gram?: number;
  calories_per_gram?: number;
  food_id?: string;
  substitutions?: string[];
}

/** Map engine meal_type keys → DB meal_type values in nutritionist_meal_templates */
const MEAL_TYPE_DB_MAP: Record<string, string[]> = {
  breakfast: ["breakfast", "cafe_da_manha"],
  morning_snack: ["morning_snack", "lanche_manha", "lanche"],
  lunch: ["lunch", "almoco"],
  afternoon_snack: ["afternoon_snack", "lanche_tarde", "lanche"],
  dinner: ["dinner", "jantar"],
  evening_snack: ["evening_snack", "ceia"],
};

/** Map engine goals → template goal_tags */
const GOAL_TAG_MAP: Record<string, string[]> = {
  lose_weight: ["emagrecimento", "lose_weight", "deficit", "cutting"],
  maintain: ["manutencao", "maintain", "maintenance"],
  gain_muscle: ["ganho_massa", "gain_muscle", "hipertrofia", "bulking"],
  gain_weight: ["ganho_massa", "gain_weight", "bulking"],
  improve_health: ["saude_geral", "improve_health", "wellness"],
  athletic_performance: ["performance", "athletic_performance"],
};

export interface TemplateResolverParams {
  goal: string;
  mealType: string;
  strategy?: string;
  nutritionistId?: string;
  complexityPreference?: string;
  excludeTemplateIds?: string[];
}

/**
 * Load all active templates from nutritionist_meal_templates.
 * Includes both global templates and nutritionist-specific ones.
 */
export async function loadMealTemplates(client: any, nutritionistId?: string): Promise<ResolvedTemplate[]> {
  let query = client
    .from("nutritionist_meal_templates")
    .select("id, name, meal_type, kcal_base, protein_base, carbs_base, fat_base, foods_structure, satiety_score, complexity_level, goal_tags, nutritionist_id, is_global, usage_count");

  // Load global templates + nutritionist-specific templates
  if (nutritionistId) {
    query = query.or(`is_global.eq.true,nutritionist_id.eq.${nutritionistId}`);
  } else {
    query = query.eq("is_global", true);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("[template-resolver] Failed to load templates:", error);
    return [];
  }

  return (data as any[])
    .filter(t => t.foods_structure && (Array.isArray(t.foods_structure) ? t.foods_structure.length > 0 : true))
    .map(t => ({
      id: t.id,
      name: t.name,
      meal_type: t.meal_type || "refeicao",
      kcal_base: Number(t.kcal_base) || 0,
      protein_base: Number(t.protein_base) || 0,
      carbs_base: Number(t.carbs_base) || 0,
      fat_base: Number(t.fat_base) || 0,
      foods_structure: parseFoodsStructure(t.foods_structure),
      satiety_score: Number(t.satiety_score) || 0,
      complexity_level: t.complexity_level || "moderate",
      goal_tags: parseGoalTags(t.goal_tags),
      nutritionist_id: t.nutritionist_id,
      is_global: t.is_global ?? false,
    }));
}

function parseFoodsStructure(raw: any): FoodStructureItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as FoodStructureItem[];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as FoodStructureItem[]; } catch { return []; }
  }
  return [];
}

function parseGoalTags(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return [raw]; }
  }
  return [];
}

/**
 * Core resolution function: finds best-matching templates for a given meal slot.
 * Returns templates sorted by relevance score (highest first).
 */
export function resolveMealTemplates(
  templates: ResolvedTemplate[],
  params: TemplateResolverParams,
): ResolvedTemplate[] {
  const { goal, mealType, strategy, complexityPreference, excludeTemplateIds } = params;

  // Step 1: Filter by meal_type
  const mealTypeKeys = MEAL_TYPE_DB_MAP[mealType] || [mealType];
  let candidates = templates.filter(t => {
    const normType = t.meal_type.toLowerCase().replace(/\s+/g, "_");
    return mealTypeKeys.some(key => normType === key || normType.includes(key));
  });

  // Step 2: Exclude already-used templates (anti-repetition)
  if (excludeTemplateIds && excludeTemplateIds.length > 0) {
    const excludeSet = new Set(excludeTemplateIds);
    const filtered = candidates.filter(t => !excludeSet.has(t.id));
    // Only apply exclusion if it doesn't eliminate ALL candidates
    if (filtered.length > 0) candidates = filtered;
  }

  if (candidates.length === 0) return [];

  // Step 3: Score each candidate
  const goalTags = GOAL_TAG_MAP[goal] || [goal];

  const scored = candidates.map(t => {
    let score = 0;

    // Goal match (+40 points)
    const templateTags = t.goal_tags.map(tag => tag.toLowerCase());
    if (goalTags.some(gt => templateTags.includes(gt.toLowerCase()))) {
      score += 40;
    }

    // Satiety score bonus (+20 max)
    if (t.satiety_score > 0) {
      score += Math.min(20, t.satiety_score * 2);
    }

    // Complexity preference match (+15)
    if (complexityPreference && t.complexity_level === complexityPreference) {
      score += 15;
    }

    // Has valid macros (+10)
    if (t.kcal_base > 0 && t.protein_base > 0) {
      score += 10;
    }

    // Has rich food structure (+10)
    if (t.foods_structure.length >= 3) {
      score += 10;
    }

    // Nutritionist-specific templates get priority over global (+5)
    if (!t.is_global) {
      score += 5;
    }

    return { template: t, score };
  });

  // Step 4: Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.map(s => s.template);
}

/**
 * Scale a template's foods_structure to match target kcal.
 * Returns scaled food items with updated macros.
 */
export function scaleTemplateToTarget(
  template: ResolvedTemplate,
  targetKcal: number,
): { foods: ScaledFoodItem[]; scaleFactor: number } {
  if (!template.kcal_base || template.kcal_base === 0) {
    return {
      foods: template.foods_structure.map(f => ({
        name: f.name,
        portion_grams: f.portion_grams,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        original_portion: f.portion_grams,
      })),
      scaleFactor: 1,
    };
  }

  let scaleFactor = targetKcal / template.kcal_base;
  // Clinical safety clamp: 0.3x – 2.5x
  scaleFactor = Math.max(0.3, Math.min(2.5, scaleFactor));

  const foods: ScaledFoodItem[] = template.foods_structure.map(food => {
    const basePortion = Number(food.portion_grams) || 100; // guard undefined/NaN
    let newPortion = Math.round(basePortion * scaleFactor);
    newPortion = Math.max(10, Math.min(500, newPortion));

    const hasPerGram = food.calories_per_gram != null && food.calories_per_gram > 0;

    if (hasPerGram) {
      return {
        name: food.name,
        portion_grams: newPortion,
        calories: Math.round(newPortion * (food.calories_per_gram || 0)),
        protein: Math.round(newPortion * (food.protein_per_gram || 0) * 10) / 10,
        carbs: Math.round(newPortion * (food.carbs_per_gram || 0) * 10) / 10,
        fat: Math.round(newPortion * (food.fat_per_gram || 0) * 10) / 10,
        original_portion: basePortion,
      };
    }

    const portionRatio = basePortion > 0 ? newPortion / basePortion : 1;
    return {
      name: food.name,
      portion_grams: newPortion,
      calories: Math.round((food.calories || 0) * portionRatio),
      protein: Math.round((food.protein || 0) * portionRatio * 10) / 10,
      carbs: Math.round((food.carbs || 0) * portionRatio * 10) / 10,
      fat: Math.round((food.fat || 0) * portionRatio * 10) / 10,
      original_portion: basePortion,
    };
  });

  return { foods, scaleFactor: Math.round(scaleFactor * 100) / 100 };
}

export interface ScaledFoodItem {
  name: string;
  portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  original_portion: number;
}

/**
 * Build a meal_plan_item from a resolved & scaled template.
 * Returns an item compatible with the engine's persist format.
 */
export function buildMealItemFromTemplate(
  template: ResolvedTemplate,
  scaledFoods: ScaledFoodItem[],
  mealType: string,
  dayOfWeek: number,
  scaleFactor: number,
): any {
  const totalCal = scaledFoods.reduce((s, f) => s + f.calories, 0);
  const totalP = scaledFoods.reduce((s, f) => s + f.protein, 0);
  const totalC = scaledFoods.reduce((s, f) => s + f.carbs, 0);
  const totalF = scaledFoods.reduce((s, f) => s + f.fat, 0);

  // Build description with gram portions — guard against undefined/NaN
  const descriptionLines = scaledFoods.map(f => {
    const grams = Number(f.portion_grams);
    const gramsStr = Number.isFinite(grams) && grams > 0 ? `${grams}g` : "";
    return gramsStr ? `• ${f.name} — ${gramsStr}` : `• ${f.name}`;
  });

  // Build substitution lines from foods_structure substitutions
  const subLines: string[] = [];
  for (const food of template.foods_structure) {
    if (food.substitutions && food.substitutions.length > 0) {
      const matchedScaled = scaledFoods.find(sf => sf.name === food.name);
      const grams = matchedScaled?.portion_grams || food.portion_grams;
      const alts = food.substitutions.slice(0, 3).map(s => `${s} (${grams}g)`);
      subLines.push(`• ${food.name} → ${alts.join(", ")}`);
    }
  }

  const description = descriptionLines.join("\n") +
    (subLines.length > 0 ? `\n\n🔄 Substituições:\n${subLines.join("\n")}` : "");

  return {
    title: template.name,
    description,
    meal_type: mealType,
    day_of_week: dayOfWeek,
    calories_target: Math.round(totalCal),
    protein_target: Math.round(totalP),
    carbs_target: Math.round(totalC),
    fat_target: Math.round(totalF),
    _source: "template_resolver",
    _template_id: template.id,
    _scale_factor: scaleFactor,
  };
}
