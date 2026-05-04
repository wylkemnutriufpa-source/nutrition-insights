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
  prioritizedTemplateIds?: string[];
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
  let arr: any[];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    try { arr = JSON.parse(raw); } catch { return []; }
  } else {
    return [];
  }
  // Normalize: templates may store `portion` (string like "120g") instead of `portion_grams` (number)
  return arr.map((item: any) => {
    const f = item as FoodStructureItem;
    if ((f.portion_grams == null || f.portion_grams === 0) && item.portion) {
      const match = String(item.portion).match(/(\d+)/);
      if (match) {
        f.portion_grams = Number(match[1]);
      }
    }
    // Also map `kcal` → `calories` if needed
    if ((f.calories == null || f.calories === 0) && item.kcal != null) {
      f.calories = Number(item.kcal) || 0;
    }
    // Map `fats` → `fat` 
    if ((f.fat == null || f.fat === 0) && item.fats != null) {
      f.fat = Number(item.fats) || 0;
    }
    // Ensure portion_grams has a fallback
    if (!f.portion_grams || f.portion_grams <= 0) {
      f.portion_grams = 100;
    }
    return f;
  });
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
  const { goal, mealType, strategy, complexityPreference, excludeTemplateIds, prioritizedTemplateIds } = params;

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

    // Prioritized match (HIGH PRIORITY: +150)
    if (prioritizedTemplateIds && prioritizedTemplateIds.length > 0) {
      if (prioritizedTemplateIds.includes(t.id)) {
        score += 150;
      }
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
// ── GUARDRAIL 2: Minimum AND Maximum portion clamps by food category ──
const MIN_PORTION_BY_CATEGORY: Record<string, number> = {
  protein: 60,   // proteínas principais: 60g mínimo
  carb: 30,      // carboidratos: 30g mínimo
  fruit: 80,     // frutas: 80g mínimo
  vegetable: 50, // vegetais: 50g mínimo
  egg: 50,       // ovos: ~1 unidade (50g)
  bread: 40,     // pão: ~1 unidade (40g)
  dairy: 100,    // laticínios: 100g mínimo
  fat: 10,       // gorduras: 10g mínimo
  other: 20,     // outros: 20g mínimo
};

const MAX_PORTION_BY_CATEGORY: Record<string, number> = {
  protein: 180,  // proteínas: máx 180g (evita porções irreais)
  carb: 200,     // carboidratos: máx 200g
  fruit: 250,    // frutas: máx 250g
  vegetable: 200,// vegetais: máx 200g
  egg: 150,      // ovos: máx ~3 unidades
  bread: 100,    // pão: máx ~2 fatias
  dairy: 250,    // laticínios: máx 250g
  fat: 15,       // azeite/óleo: máx 15g (1 colher de sopa)
  nuts: 40,      // oleaginosas: máx 40g
  other: 200,    // outros: máx 200g
};

const PORTION_CATEGORY_KEYWORDS: Record<string, string[]> = {
  protein: ["frango", "carne", "bife", "tilapia", "peixe", "porco", "sardinha", "alcatra", "sobrecoxa", "lombo", "patinho"],
  egg: ["ovo", "omelete", "clara"],
  bread: ["pao", "tapioca", "cuscuz", "torrada"],
  fruit: ["banana", "maca", "mamao", "laranja", "morango", "goiaba", "melancia", "abacaxi", "manga", "tangerina", "fruta"],
  vegetable: ["alface", "tomate", "brocolis", "cenoura", "couve", "repolho", "chuchu", "abobrinha", "salada", "verdura", "rucula"],
  carb: ["arroz", "macarrao", "batata", "macaxeira", "inhame", "mandioca", "farinha", "farofa"],
  dairy: ["iogurte", "leite", "queijo", "requeijao"],
  fat: ["azeite", "oleo"],
  nuts: ["castanha", "amendoim", "pasta de amendoim", "amendoa", "nozes"],
};

function classifyFoodForPortion(name: string): string {
  const norm = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  for (const [category, keywords] of Object.entries(PORTION_CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => norm.includes(kw))) return category;
  }
  return "other";
}

function clampPortion(name: string, portion: number): number {
  const cat = classifyFoodForPortion(name);
  const min = MIN_PORTION_BY_CATEGORY[cat] || MIN_PORTION_BY_CATEGORY.other;
  const max = MAX_PORTION_BY_CATEGORY[cat] || MAX_PORTION_BY_CATEGORY.other;
  return Math.max(min, Math.min(max, portion));
}

export function scaleTemplateToTarget(
  template: ResolvedTemplate,
  targetKcal: number,
): { foods: ScaledFoodItem[]; scaleFactor: number } {
  if (!template.kcal_base || template.kcal_base === 0) {
    return {
      foods: template.foods_structure
        .filter(f => f.name && f.name.trim().length > 0) // GUARDRAIL 3: skip empty names
        .map(f => ({
          name: f.name,
          portion_grams: clampPortion(f.name, f.portion_grams),
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

  const foods: ScaledFoodItem[] = template.foods_structure
    .filter(f => f.name && f.name.trim().length > 0) // GUARDRAIL 3: skip empty names
    .map(food => {
      const basePortion = Number(food.portion_grams) || 100; // guard undefined/NaN
      let newPortion = Math.round(basePortion * scaleFactor);
      newPortion = Math.max(10, Math.min(500, newPortion));
      // GUARDRAIL 2: Enforce min AND max portion by food category
      newPortion = clampPortion(food.name, newPortion);

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
  // Use only valid-named foods for totals
  const validAllFoods = scaledFoods.filter(f => f.name && f.name.trim().length > 0);
  let totalCal = validAllFoods.reduce((s, f) => s + f.calories, 0);
  let totalP = validAllFoods.reduce((s, f) => s + f.protein, 0);
  let totalC = validAllFoods.reduce((s, f) => s + f.carbs, 0);
  let totalF = validAllFoods.reduce((s, f) => s + f.fat, 0);

  // Fallback: If individual food macros were missing in the template structure (common in global templates),
  // use the template's base macros scaled by the scaleFactor.
  if (totalCal === 0 && template.kcal_base > 0) {
    totalCal = template.kcal_base * scaleFactor;
    totalP = template.protein_base * scaleFactor;
    totalC = template.carbs_base * scaleFactor;
    totalF = template.fat_base * scaleFactor;
  }

  // Build description with gram portions — guard against undefined/NaN
  // GUARDRAIL 3: Filter out foods with empty/invalid names before building description
  const validFoods = scaledFoods.filter(f => f.name && f.name.trim().length > 0);
  if (validFoods.length === 0) {
    return {
      title: template.name,
      description: `• ${template.name}`,
      meal_type: mealType,
      day_of_week: dayOfWeek,
      calories_target: null,
      protein_target: null,
      carbs_target: null,
      fat_target: null,
      _source: "template_resolver",
      _template_id: template.id,
      _scale_factor: scaleFactor,
    };
  }

  const descriptionLines = validFoods.map(f => {
    const grams = Number(f.portion_grams);
    const gramsStr = Number.isFinite(grams) && grams > 0 ? `${grams}g` : "";
    return gramsStr ? `• ${f.name} — ${gramsStr}` : `• ${f.name}`;
  });

  // Build substitution lines from foods_structure substitutions
  const subLines: string[] = [];
  const subJson: string[] = [];
  
  for (const food of template.foods_structure) {
    if (food.substitutions && food.substitutions.length > 0) {
      const matchedScaled = scaledFoods.find(sf => sf.name === food.name);
      const rawGrams = matchedScaled?.portion_grams ?? food.portion_grams;
      const grams = Number.isFinite(Number(rawGrams)) && Number(rawGrams) > 0 ? Number(rawGrams) : 100;
      
      const alts = food.substitutions.slice(0, 4).map(s => `${s} (${grams}g)`);
      subLines.push(`• ${food.name} → ${alts.join(", ")}`);
      
      // Also populate subJson for actual data structure if needed by editor
      food.substitutions.slice(0, 4).forEach(s => {
        if (!subJson.includes(s)) subJson.push(s);
      });
    }
  }

  const description = descriptionLines.join("\n") +
    (subLines.length > 0 ? `\n\n🔄 Substituições:\n${subLines.join("\n")}` : "");

  // Validate totals — never allow zero/NaN
  const safeCal = Number.isFinite(totalCal) && totalCal > 0 ? Math.round(totalCal) : null;
  const safeP = Number.isFinite(totalP) && totalP > 0 ? Math.round(totalP) : null;
  const safeC = Number.isFinite(totalC) && totalC >= 0 ? Math.round(totalC) : null;
  const safeF = Number.isFinite(totalF) && totalF >= 0 ? Math.round(totalF) : null;

  return {
    title: template.name,
    description,
    meal_type: mealType,
    day_of_week: dayOfWeek,
    calories_target: safeCal,
    protein_target: safeP,
    carbs_target: safeC,
    fat_target: safeF,
    _source: "template_resolver",
    _template_id: template.id,
    _scale_factor: scaleFactor,
  };
}
