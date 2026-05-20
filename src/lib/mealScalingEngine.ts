/**
 * Motor de Escala Nutricional Automática
 * Scales meal templates to patient macro targets with clinical safety limits.
 */

export interface FoodStructureItem {
  name: string;
  portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Per-gram macros — when present, engine uses these for precise scaling */
  protein_per_gram?: number;
  carbs_per_gram?: number;
  fat_per_gram?: number;
  calories_per_gram?: number;
  /** Link to ifj_food_database for dynamic lookups */
  food_id?: string;
  substitutions?: string[];
}

export interface MealTemplate {
  id: string;
  name: string;
  tipo_refeicao: string;
  kcal_base: number;
  protein_base: number;
  carbs_base: number;
  fat_base: number;
  foods_structure: FoodStructureItem[];
  goal_tags?: string[];
  complexity_level?: string;
  satiety_score?: number;
}

export interface ScalingTarget {
  target_kcal: number;
  meta_proteinas?: number;
  meta_carboidratos?: number;
  meta_gorduras?: number;
  patient_weight_kg?: number;
}

export interface ScaledMeal {
  name: string;
  foods: ScaledFoodItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  scale_factor: number;
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

// Relaxed limits to allow professional control
const CLINICAL_LIMITS = {
  MAX_PROTEIN_PER_KG: 4.0,
  MIN_FAT_GRAMS: 10,
  MIN_PORTION_GRAMS: 5,
  MAX_SCALE_FACTOR: 10,
  MIN_SCALE_FACTOR: 0.1,
  MAX_SINGLE_PORTION_GRAMS: 5000,
};

export function scaleMealToTarget(
  template: MealTemplate,
  target: ScalingTarget
): ScaledMeal {
  // SOBERANIA V3: Filtra a estrutura para remover substituições do cálculo principal
  const primaryStructure = template.foods_structure.filter(f => !f.name.toLowerCase().includes('🔄') && !f.name.toLowerCase().includes('substitu'));

  if (!template.kcal_base || template.kcal_base === 0) {
    return {
      name: template.name,
      foods: primaryStructure.map(f => ({
        ...f,
        original_portion: f.portion_grams,
      })),
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0,
      scale_factor: 1,
    };
  }

  // 1. Calculate raw scale factor
  let scaleFactor = target.target_kcal / template.kcal_base;

  // 2. Clamp to clinical limits
  scaleFactor = Math.max(CLINICAL_LIMITS.MIN_SCALE_FACTOR, 
    Math.min(CLINICAL_LIMITS.MAX_SCALE_FACTOR, scaleFactor));

  // 3. Scale each food — use per-gram macros when available for precision
  const scaledFoods: ScaledFoodItem[] = primaryStructure.map(food => {
    let newPortion = Math.round(food.portion_grams * scaleFactor);
    newPortion = Math.max(CLINICAL_LIMITS.MIN_PORTION_GRAMS, 
      Math.min(CLINICAL_LIMITS.MAX_SINGLE_PORTION_GRAMS, newPortion));

    // Prefer per-gram macros (dynamic) over ratio-based scaling (legacy)
    const hasPerGram = food.calories_per_gram != null && food.calories_per_gram > 0;

    if (hasPerGram) {
      return {
        name: food.name,
        portion_grams: newPortion,
        calories: Math.round(newPortion * (food.calories_per_gram || 0)),
        protein: Math.round(newPortion * (food.protein_per_gram || 0) * 10) / 10,
        carbs: Math.round(newPortion * (food.carbs_per_gram || 0) * 10) / 10,
        fat: Math.round(newPortion * (food.fat_per_gram || 0) * 10) / 10,
        original_portion: food.portion_grams,
      };
    }

    // Fallback: ratio-based scaling for legacy data without per-gram values
    const portionRatio = newPortion / food.portion_grams;
    return {
      name: food.name,
      portion_grams: newPortion,
      calories: Math.round(food.calories * portionRatio),
      protein: Math.round(food.protein * portionRatio * 10) / 10,
      carbs: Math.round(food.carbs * portionRatio * 10) / 10,
      fat: Math.round(food.fat * portionRatio * 10) / 10,
      original_portion: food.portion_grams,
    };
  });

  // 4. Calculate totals
  let totalProtein = scaledFoods.reduce((s, f) => s + f.protein, 0);
  let totalCarbs = scaledFoods.reduce((s, f) => s + f.carbs, 0);
  let totalFat = scaledFoods.reduce((s, f) => s + f.fat, 0);
  let totalCalories = scaledFoods.reduce((s, f) => s + f.calories, 0);

  // 5. Apply protein cap per kg
  if (target.patient_weight_kg && totalProtein > target.patient_weight_kg * CLINICAL_LIMITS.MAX_PROTEIN_PER_KG) {
    const proteinCap = target.patient_weight_kg * CLINICAL_LIMITS.MAX_PROTEIN_PER_KG;
    const proteinRatio = proteinCap / totalProtein;
    scaledFoods.forEach(f => {
      f.protein = Math.round(f.protein * proteinRatio * 10) / 10;
    });
    totalProtein = proteinCap;
  }

  // 6. Ensure minimum fat
  if (totalFat < CLINICAL_LIMITS.MIN_FAT_GRAMS) {
    const fatDiff = CLINICAL_LIMITS.MIN_FAT_GRAMS - totalFat;
    // Distribute across items proportionally
    const fatItems = scaledFoods.filter(f => f.fat > 0);
    if (fatItems.length > 0) {
      const addPerItem = fatDiff / fatItems.length;
      fatItems.forEach(f => {
        f.fat = Math.round((f.fat + addPerItem) * 10) / 10;
        f.calories += Math.round(addPerItem * 9);
      });
    }
    totalFat = CLINICAL_LIMITS.MIN_FAT_GRAMS;
  }

  return {
    name: template.name,
    foods: scaledFoods,
    total_calories: Math.round(totalCalories),
    total_protein: Math.round(totalProtein * 10) / 10,
    total_carbs: Math.round(totalCarbs * 10) / 10,
    total_fat: Math.round(totalFat * 10) / 10,
    scale_factor: Math.round(scaleFactor * 100) / 100,
  };
}

/**
 * Rank templates for a patient based on goal, complexity, and historical performance.
 */
export function rankTemplatesForPatient(
  templates: (MealTemplate & { avg_adherence?: number; usage_count?: number })[],
  patientGoal: string,
  patientCluster?: string,
  targetMealType?: string,
): (MealTemplate & { relevance_score: number })[] {
  return templates
    .map(t => {
      let score = 0;

      // Goal match (+40)
      const tags = (t.goal_tags || []) as string[];
      if (tags.some(tag => tag.toLowerCase().includes(patientGoal.toLowerCase()))) {
        score += 40;
      }

      // Meal type match (+20)
      if (targetMealType && t.tipo_refeicao === targetMealType) {
        score += 20;
      }

      // Historical adherence (+30 max)
      if (t.avg_adherence && t.avg_adherence > 0) {
        score += Math.min(30, t.avg_adherence * 0.3);
      }

      // Usage popularity (+10 max)
      if (t.usage_count && t.usage_count > 0) {
        score += Math.min(10, t.usage_count);
      }

      // Complexity preference based on cluster
      if (patientCluster === 'behavioral_struggler' && t.complexity_level === 'simple') {
        score += 15;
      } else if (patientCluster === 'metabolic_responder' && t.complexity_level !== 'simple') {
        score += 10;
      }

      return { ...t, relevance_score: score };
    })
    .sort((a, b) => b.relevance_score - a.relevance_score);
}
