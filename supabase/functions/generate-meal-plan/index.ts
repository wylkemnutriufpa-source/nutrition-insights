import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ──── Constants ────
const ENGINE_VERSION = "2.1.0";
const PROTOCOL_VERSION = "fitjourney_master_v1";

const MEAL_KCAL_SPLIT: Record<string, number> = {
  breakfast: 0.20,
  morning_snack: 0.10,
  lunch: 0.30,
  afternoon_snack: 0.10,
  dinner: 0.22,
  evening_snack: 0.08,
};

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_KCAL_ADJUSTMENT: Record<string, number> = {
  lose_weight: -500,
  maintain: 0,
  gain_muscle: 300,
  gain_weight: 500,
  improve_health: -200,
  athletic_performance: 200,
};

const GOAL_STRATEGY: Record<string, { calorie: string; macro: string }> = {
  lose_weight: { calorie: "calorie_deficit", macro: "high_protein_cut" },
  maintain: { calorie: "maintenance", macro: "balanced" },
  gain_muscle: { calorie: "calorie_surplus_moderate", macro: "high_protein_bulk" },
  gain_weight: { calorie: "calorie_surplus_high", macro: "high_carb_bulk" },
  improve_health: { calorie: "slight_deficit", macro: "anti_inflammatory" },
  athletic_performance: { calorie: "calorie_surplus_moderate", macro: "performance_endurance" },
};

// ──── TMB Calculator (Mifflin-St Jeor) ────
function calculateTMB(weight: number, height: number, age: number, sex: string): number {
  if (sex === "female") return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
}

// ──── TDEE + Goal-adjusted target ────
function calculateTDEE(tmb: number, activityLevel: string): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.375;
  return Math.round(tmb * multiplier);
}

function calculateTargetKcal(tdee: number, goal: string): number {
  const adjustment = GOAL_KCAL_ADJUSTMENT[goal] || 0;
  return Math.max(1000, Math.min(3500, tdee + adjustment));
}

// ──── Macro distribution by goal ────
function calculateMacros(kcal: number, goal: string, weight: number) {
  let proteinPerKg: number, carbsPct: number, fatPct: number;
  switch (goal) {
    case "lose_weight":
      proteinPerKg = 2.0; carbsPct = 0.35; fatPct = 0.30; break;
    case "gain_muscle":
      proteinPerKg = 2.2; carbsPct = 0.45; fatPct = 0.25; break;
    case "athletic_performance":
      proteinPerKg = 2.0; carbsPct = 0.50; fatPct = 0.25; break;
    default:
      proteinPerKg = 1.6; carbsPct = 0.45; fatPct = 0.30;
  }
  const protein = Math.round(weight * proteinPerKg);
  const proteinKcal = protein * 4;
  const remaining = kcal - proteinKcal;
  const carbs = Math.round((remaining * (carbsPct / (carbsPct + fatPct))) / 4);
  const fat = Math.round((remaining * (fatPct / (carbsPct + fatPct))) / 9);
  return { protein, carbs, fat };
}

// ──── Map goal → template conditions ────
function mapGoalToConditions(goal: string): string[] {
  const map: Record<string, string[]> = {
    lose_weight: ["emagrecimento", "sobrepeso", "obesidade", "deficit", "low_carb"],
    gain_muscle: ["hipertrofia", "ganho_massa", "atleta", "superavit"],
    maintain: ["manutencao", "equilibrio", "reeducacao"],
    gain_weight: ["baixo peso", "ganho de massa", "hipercalórico"],
    improve_health: ["anti_inflamatorio", "longevidade", "cardiovascular"],
    athletic_performance: ["corrida", "ciclismo", "resistência", "endurance"],
  };
  return map[goal] || ["manutencao", "equilibrio"];
}

// ──── Score template against patient data ────
function scoreTemplate(
  template: any, goal: string, restrictions: string[],
  conditions: string[], kcalTarget: number, cookingPref: string
): { score: number; breakdown: { goal_match: number; restriction_match: number; calorie_match: number; clinical_match: number; preference_match: number }; reasons: string[] } {
  let goalScore = 0, restrictionScore = 0, calorieScore = 0, clinicalScore = 0, preferenceScore = 0;
  const reasons: string[] = [];
  const tConds = (template.conditions || []) as string[];
  const tTags = (template.tags || []) as string[];
  const goalConds = mapGoalToConditions(goal);

  // 1. Goal match (highest weight)
  for (const gc of goalConds) {
    if (tConds.some((c: string) => c.toLowerCase().includes(gc))) { goalScore += 10; reasons.push(`Objetivo "${gc}" compatível`); }
    if (tTags.some((t: string) => t.toLowerCase().includes(gc))) goalScore += 5;
  }

  // 2. Medical conditions match
  for (const cond of conditions) {
    if (tConds.some((c: string) => c.toLowerCase().includes(cond.toLowerCase()))) { clinicalScore += 15; reasons.push(`Condição "${cond}" contemplada`); }
    if (tTags.some((t: string) => t.toLowerCase().includes(cond.toLowerCase()))) clinicalScore += 8;
  }

  // 3. Dietary restrictions
  if (restrictions.includes("vegetarian") || restrictions.includes("vegan")) {
    if (template.slug?.includes("veg")) { restrictionScore += 20; reasons.push("Template vegetariano/vegano"); }
    else restrictionScore -= 5;
  }
  if (restrictions.includes("gluten_free") && tTags.includes("sem_gluten")) { restrictionScore += 10; reasons.push("Sem glúten"); }
  if (restrictions.includes("lactose_free") && tTags.includes("sem_lactose")) { restrictionScore += 10; reasons.push("Sem lactose"); }

  // 4. Calorie proximity
  const calDiff = Math.abs((template.base_calories || 2000) - kcalTarget);
  if (calDiff < 100) { calorieScore += 15; reasons.push(`Calorias muito próximas (±${calDiff})`); }
  else if (calDiff < 200) { calorieScore += 10; reasons.push(`Calorias próximas (±${calDiff})`); }
  else if (calDiff < 400) calorieScore += 5;
  else if (calDiff > 600) calorieScore -= 5;

  // 5. Cooking preference match
  if (cookingPref === "quick" && (template.slug?.includes("pratico") || tTags.includes("pratico"))) { preferenceScore += 8; reasons.push("Cardápio prático"); }

  // 6. "Dieta flexível" bonus
  if (template.slug?.includes("flexivel") || tTags.includes("flexivel")) preferenceScore += 3;

  const score = goalScore + restrictionScore + calorieScore + clinicalScore + preferenceScore;
  return { score, breakdown: { goal_match: goalScore, restriction_match: restrictionScore, calorie_match: calorieScore, clinical_match: clinicalScore, preference_match: preferenceScore }, reasons };
}

// ──── Filter food by restrictions ────
function isFoodAllowed(name: string, desc: string, restrictions: string[]): boolean {
  const text = `${name} ${desc}`.toLowerCase();
  if (restrictions.includes("vegetarian") && text.match(/frango|carne|atum|peixe|tilápia|salmão|sardinha|patinho|boi|porco|peru|bacon/)) return false;
  if (restrictions.includes("vegan") && text.match(/frango|carne|atum|peixe|ovo|leite|queijo|iogurte|whey|requeijão|mel|manteiga|ricota|cottage|kefir|coalhada|peru|salmão|sardinha|patinho|boi/)) return false;
  if (restrictions.includes("gluten_free") && text.match(/pão|torrada|macarrão|aveia|granola|biscoito|trigo|wrap/)) return false;
  if (restrictions.includes("lactose_free") && text.match(/leite|queijo|iogurte|requeijão|coalhada|kefir|manteiga|ricota|cottage/)) return false;
  return true;
}

function isDisliked(name: string, desc: string, disliked: string[]): boolean {
  const text = `${name} ${desc}`.toLowerCase();
  return disliked.some(d => text.includes(d));
}

// ──── Generate plan items from template ────
function generatePlanFromTemplate(
  template: any, kcalTarget: number, macros: { protein: number; carbs: number; fat: number },
  restrictions: string[], disliked: string[], planOptionIndex: number = 0
): any[] {
  const meals = (template.meals || []) as any[];
  const items: any[] = [];

  // Fallback: if template has no meals defined, generate basic structure
  if (meals.length === 0) {
    const defaultMealTypes = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];
    for (let day = 0; day < 7; day++) {
      for (const mealType of defaultMealTypes) {
        const targetKcal = Math.round(kcalTarget * (MEAL_KCAL_SPLIT[mealType] || 0.15));
        const mealMacroRatio = targetKcal / kcalTarget;
        items.push({
          meal_type: mealType,
          day_of_week: day,
          title: mealType === "breakfast" ? "Café da Manhã" :
                 mealType === "morning_snack" ? "Lanche da Manhã" :
                 mealType === "lunch" ? "Almoço" :
                 mealType === "afternoon_snack" ? "Lanche da Tarde" :
                 mealType === "dinner" ? "Jantar" : "Ceia",
          description: "Refeição a ser personalizada pelo profissional.",
          calories_target: targetKcal,
          protein_target: Math.round(macros.protein * mealMacroRatio),
          carbs_target: Math.round(macros.carbs * mealMacroRatio),
          fat_target: Math.round(macros.fat * mealMacroRatio),
        });
      }
    }
    return items;
  }

  for (let day = 0; day < 7; day++) {
    for (const mealTemplate of meals) {
      const mealType = mealTemplate.meal_type || "lunch";
      const foods = (mealTemplate.foods || []) as any[];
      const targetKcal = Math.round(kcalTarget * (MEAL_KCAL_SPLIT[mealType] || 0.15));

      let allowedFoods = foods.filter((f: any) =>
        isFoodAllowed(f.name || "", f.portion || "", restrictions) &&
        !isDisliked(f.name || "", f.portion || "", disliked)
      );

      if (allowedFoods.length === 0) {
        for (const f of foods) {
          for (const sub of (f.substitutions || []) as string[]) {
            if (isFoodAllowed(sub, "", restrictions) && !isDisliked(sub, "", disliked)) {
              allowedFoods.push({ ...f, name: sub, _substituted: true });
              break;
            }
          }
        }
      }
      if (allowedFoods.length === 0) allowedFoods = foods;

      // Use planOptionIndex to create different rotation patterns per option
      const rotationSeed = planOptionIndex * 3;
      const dayFoods = allowedFoods.map((f: any, fIdx: number) => {
        // Different option = different days trigger substitution
        const shouldRotate = (day + rotationSeed + fIdx) % 3 !== 0;
        if (shouldRotate && (f.substitutions || []).length > 0 && !f._substituted) {
          const subIdx = (day + planOptionIndex + fIdx) % f.substitutions.length;
          const subName = f.substitutions[subIdx];
          if (isFoodAllowed(subName, "", restrictions) && !isDisliked(subName, "", disliked)) {
            return { ...f, name: subName, _rotated: true };
          }
        }
        return f;
      });

      const foodLines = dayFoods.map((f: any) => `• ${f.name} — ${f.portion || ""}`).join("\n");
      const subsLines = dayFoods
        .filter((f: any) => (f.substitutions || []).length > 0 && !f._rotated)
        .map((f: any) => `• ${f.name}: ${f.substitutions.slice(0, 2).join(", ")}`)
        .join("\n");
      const description = `${foodLines}${subsLines ? `\n\n🔄 Substituições:\n${subsLines}` : ""}`;

      const totalFoodKcal = dayFoods.reduce((sum: number, f: any) => sum + (f.calories || 0), 0) || 1;
      const mealRatio = targetKcal / totalFoodKcal;

      items.push({
        meal_type: mealType,
        day_of_week: day,
        title: mealTemplate.title || mealType,
        description,
        calories_target: targetKcal,
        protein_target: Math.round(dayFoods.reduce((s: number, f: any) => s + (f.protein || 0), 0) * mealRatio),
        carbs_target: Math.round(dayFoods.reduce((s: number, f: any) => s + (f.carbs || 0), 0) * mealRatio),
        fat_target: Math.round(dayFoods.reduce((s: number, f: any) => s + (f.fat || 0), 0) * mealRatio),
      });
    }
  }
  return items;
}

// ──── Post-generation macro reconciliation ────
// Ensures daily totals match patient targets within clinical tolerance.
// Adjusts each item proportionally so the sum aligns perfectly.
function reconcileDailyMacros(
  items: any[],
  dailyKcalTarget: number,
  dailyMacros: { protein: number; carbs: number; fat: number },
): any[] {
  // Group items by day
  const byDay = new Map<number, any[]>();
  for (const item of items) {
    const day = item.day_of_week;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(item);
  }

  const reconciled: any[] = [];

  for (const [, dayItems] of byDay) {
    // Sum current day totals
    const totalCals = dayItems.reduce((s: number, i: any) => s + (i.calories_target || 0), 0);
    const totalP = dayItems.reduce((s: number, i: any) => s + (i.protein_target || 0), 0);
    const totalC = dayItems.reduce((s: number, i: any) => s + (i.carbs_target || 0), 0);
    const totalF = dayItems.reduce((s: number, i: any) => s + (i.fat_target || 0), 0);

    // Calculate correction factors (avoid div by zero)
    const calFactor = totalCals > 0 ? dailyKcalTarget / totalCals : 1;
    const pFactor = totalP > 0 ? dailyMacros.protein / totalP : 1;
    const cFactor = totalC > 0 ? dailyMacros.carbs / totalC : 1;
    const fFactor = totalF > 0 ? dailyMacros.fat / totalF : 1;

    // Apply proportional correction to each item
    for (const item of dayItems) {
      reconciled.push({
        ...item,
        calories_target: Math.round((item.calories_target || 0) * calFactor),
        protein_target: Math.round((item.protein_target || 0) * pFactor),
        carbs_target: Math.round((item.carbs_target || 0) * cFactor),
        fat_target: Math.round((item.fat_target || 0) * fFactor),
      });
    }
  }

  return reconciled;
}

// ──── Deterministic tips engine ────
function generateTips(answers: Record<string, any>): { tip: string; category: string; icon: string }[] {
  const tips: { tip: string; category: string; icon: string }[] = [];
  if (answers.water_intake && answers.water_intake < 8)
    tips.push({ tip: "Você bebe menos de 2L de água/dia. Tente aumentar gradualmente.", category: "hydration", icon: "💧" });
  if (answers.sleep_time && answers.wake_time) {
    const sleep = parseInt(answers.sleep_time.split(":")[0]);
    const wake = parseInt(answers.wake_time.split(":")[0]);
    const hours = sleep > wake ? (24 - sleep + wake) : (wake - sleep);
    if (hours < 7) tips.push({ tip: "Menos de 7h de sono. Essencial para metabolismo ativo.", category: "sleep", icon: "😴" });
  }
  if (answers.activity_level === "sedentary")
    tips.push({ tip: "Comece com 20min de caminhada, 3x/semana.", category: "exercise", icon: "🚶" });
  if (answers.goal === "lose_weight")
    tips.push({ tip: "Coma devagar e mastigue bem para saciedade.", category: "nutrition", icon: "🍽️" });
  if (answers.goal === "gain_muscle")
    tips.push({ tip: "Distribua proteína ao longo do dia.", category: "nutrition", icon: "💪" });
  if (answers.meals_per_day && answers.meals_per_day < 4)
    tips.push({ tip: "Faça pelo menos 4 refeições/dia.", category: "nutrition", icon: "🕐" });
  if (answers.bowel_function === "irregular" || answers.bowel_function === "constipated")
    tips.push({ tip: "Aumente fibras e água para regularizar intestino.", category: "digestion", icon: "🌿" });
  return tips;
}

// ──── Build standardized generation_metadata ────
function buildGenerationMetadata(
  tmb: number, tdee: number, tdeeFactor: number, kcalTarget: number, goal: string,
  macros: { protein: number; carbs: number; fat: number }, weight: number, height: number,
  age: number, sex: string, activityLevel: string, dataSource: string,
  bestTemplate: any, scoredTemplates: any[], restrictions: string[],
  medicalConditions: string[], cookingPref: string, disliked: string[]
): Record<string, any> {
  const strategy = GOAL_STRATEGY[goal] || { calorie: "unknown", macro: "unknown" };
  return {
    engine_version: ENGINE_VERSION,
    protocol_version: PROTOCOL_VERSION,
    bmr_formula: "mifflin_st_jeor",
    bmr_value: tmb,
    tdee_factor: tdeeFactor,
    tdee_value: tdee,
    goal,
    goal_strategy: strategy.calorie,
    calorie_target: kcalTarget,
    macro_strategy: strategy.macro,
    macros: {
      protein_g: macros.protein,
      carbs_g: macros.carbs,
      fat_g: macros.fat,
    },
    patient_data: { weight, height, age, sex, activity_level: activityLevel },
    template_selected: {
      id: bestTemplate.id,
      slug: bestTemplate.slug,
      name: bestTemplate.name,
      version: bestTemplate.template_version || 1,
    },
    template_score: bestTemplate._score,
    score_breakdown: bestTemplate._breakdown,
    alternatives: scoredTemplates.slice(1, 4).map((t: any) => ({
      id: t.id, slug: t.slug, name: t.name, score: t._score,
    })),
    data_sources: dataSource === "physical_assessment"
      ? ["anamnesis", "physical_assessment"]
      : ["anamnesis"],
    restrictions,
    medical_conditions: medicalConditions,
    cooking_preference: cookingPref,
    disliked_foods: disliked,
    generated_at: new Date().toISOString(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = authUser.id;

    const body = await req.json();
    const patient_id = body.patient_id || body.patientId;
    const meal_plan_id = body.meal_plan_id;
    const isPipeline = body.isPipeline || false;
    const planCount = Math.min(Math.max(body.planCount || 1, 1), 3);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 1. VALIDATION: Get completed anamnesis ──
    const { data: anamnesis } = await serviceClient
      .from("patient_anamnesis")
      .select("*")
      .eq("user_id", patient_id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!anamnesis) {
      return new Response(JSON.stringify({ error: "Anamnese concluída não encontrada", code: "ANAMNESIS_MISSING" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const answers = (anamnesis.answers || {}) as Record<string, any>;

    // ── 2. VALIDATION: weight + height ──
    const weight = body.weight || answers.weight;
    const height = body.height || answers.height;
    if (!weight || weight < 20 || !height || height < 80) {
      return new Response(JSON.stringify({ error: "Peso e altura válidos são obrigatórios", code: "BODY_DATA_MISSING" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. VALIDATION: goal ──
    const goal = body.goal || answers.goal || answers.objective;
    if (!goal) {
      return new Response(JSON.stringify({ error: "Objetivo do paciente não definido", code: "GOAL_MISSING" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Calculate TMB / TDEE / macros deterministically ──
    const age = answers.age || 30;
    const sex = answers.sex || answers.gender || "male";
    const activityLevel = answers.activity_level || "light";

    const tmb = calculateTMB(weight, height, age, sex);
    const tdeeFactor = ACTIVITY_MULTIPLIERS[activityLevel] || 1.375;
    const tdee = calculateTDEE(tmb, activityLevel);
    const kcalTarget = calculateTargetKcal(tdee, goal);
    const macros = calculateMacros(kcalTarget, goal, weight);

    // Check physical assessment override
    const { data: physicalAssessment } = await serviceClient
      .from("physical_assessments")
      .select("calories_target, protein_target, carbs_target, fat_target, tdee, bmr")
      .eq("patient_id", patient_id)
      .order("assessment_date", { ascending: false })
      .limit(1)
      .single();

    const finalKcal = physicalAssessment?.calories_target || kcalTarget;
    const finalMacros = {
      protein: physicalAssessment?.protein_target || macros.protein,
      carbs: physicalAssessment?.carbs_target || macros.carbs,
      fat: physicalAssessment?.fat_target || macros.fat,
    };
    const dataSource = physicalAssessment?.calories_target ? "physical_assessment" : "anamnesis_calculated";

    // Pipeline overrides
    const pipelineOverrides = isPipeline ? {
      cooking_preference: body.cookingPreference,
      food_preferences: body.foodPreferences,
      wake_time: body.wakeTime,
      sleep_time: body.sleepTime,
      meal_count: body.mealCount,
    } : {};
    const mergedAnswers = { ...answers, ...pipelineOverrides };

    // ── 5. Fetch ALL active diet templates ──
    const { data: templates, error: tplErr } = await serviceClient
      .from("diet_templates")
      .select("*")
      .eq("is_active", true);

    if (tplErr || !templates || templates.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum template de dieta ativo no banco", code: "NO_TEMPLATES" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 6. Score and rank ALL templates ──
    const restrictions = mergedAnswers.restrictions || [];
    const medicalConditions = mergedAnswers.medical_conditions || mergedAnswers.health_conditions || [];
    const disliked = (mergedAnswers.disliked_foods || "").toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean);
    const cookingPref = mergedAnswers.cooking_preference || "";

    const scoredTemplates = templates
      .map((t: any) => {
        const { score, breakdown, reasons } = scoreTemplate(t, goal, restrictions, medicalConditions, finalKcal, cookingPref);
        return { ...t, _score: score, _breakdown: breakdown, _reasons: reasons };
      })
      .sort((a: any, b: any) => b._score - a._score);

    const bestTemplate = scoredTemplates[0];

    // ── 7. Multi-plan support: generate N plans from top N templates ──
    const startDate = new Date().toISOString().split("T")[0];
    if (isPipeline && planCount > 1 && !meal_plan_id) {
      const topTemplates = scoredTemplates.slice(0, planCount);
      const generatedPlans: any[] = [];
      const nutritionistId = body.nutritionistId;

      for (let tplIdx = 0; tplIdx < topTemplates.length; tplIdx++) {
        const template = topTemplates[tplIdx];
        const rawItems = generatePlanFromTemplate(template, finalKcal, finalMacros, restrictions, disliked, tplIdx);
        const planItems = reconcileDailyMacros(rawItems, finalKcal, finalMacros);
        const genMeta = buildGenerationMetadata(
          tmb, tdee, tdeeFactor, finalKcal, goal, finalMacros, weight, height,
          age, sex, activityLevel, dataSource, template, scoredTemplates,
          restrictions, medicalConditions, cookingPref, disliked
        );

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const { data: newPlan, error: planErr } = await serviceClient
          .from("meal_plans")
          .insert({
            title: `Opção ${tplIdx + 1} — ${template.name}`,
            description: `Gerado pelo Protocolo FitJourney v${ENGINE_VERSION}. Template: ${template.name}. Meta: ${finalKcal}kcal/dia. Score: ${template._score}pts.`,
            patient_id,
            nutritionist_id: nutritionistId,
            start_date: startDate,
            end_date: endDate.toISOString().split("T")[0],
            is_active: false,
            plan_status: "draft_auto_generated",
            template_id: template.id,
            template_slug: template.slug,
            template_version: 1,
            generation_source: "protocol_fitjourney",
            generated_by: userId,
            generation_metadata: genMeta,
          })
          .select("id")
          .single();

        if (planErr || !newPlan) {
          console.error("Failed to create plan option:", planErr);
          continue;
        }

        const itemsToInsert = planItems.map((item: any) => ({ ...item, meal_plan_id: newPlan.id }));
        await serviceClient.from("meal_plan_items").insert(itemsToInsert);

        generatedPlans.push({
          mealPlanId: newPlan.id,
          templateName: template.name,
          templateSlug: template.slug,
          templateId: template.id,
          score: template._score,
          scoreBreakdown: template._breakdown,
          reasons: template._reasons,
          baseCalories: template.base_calories,
          itemsCount: planItems.length,
        });
      }

      // Save tips (once)
      const tips = generateTips(mergedAnswers);
      await serviceClient.from("patient_tips").delete().eq("user_id", patient_id);
      if (tips.length > 0) {
        await serviceClient.from("patient_tips").insert(tips.map((t) => ({ user_id: patient_id, ...t })));
      }

      // Save computed values
      await serviceClient.from("patient_anamnesis").update({
        computed_tmb: tmb,
        computed_kcal_target: finalKcal,
        computed_protein: finalMacros.protein,
        computed_carbs: finalMacros.carbs,
        computed_fat: finalMacros.fat,
      }).eq("id", anamnesis.id);

      // Timeline
      await serviceClient.from("patient_timeline").insert({
        patient_id,
        event_type: "meal_plan",
        title: "Opções de Plano Alimentar Geradas",
        description: `${generatedPlans.length} opções geradas pelo Protocolo FitJourney v${ENGINE_VERSION}. Meta: ${finalKcal}kcal/dia.`,
        metadata: {
          type: "multi_plan_generated",
          protocol: PROTOCOL_VERSION,
          engine_version: ENGINE_VERSION,
          plan_count: generatedPlans.length,
          plans: generatedPlans.map(p => ({ id: p.mealPlanId, template: p.templateName, score: p.score })),
        },
        created_by: userId,
      });

      const explainability = {
        engine_version: ENGINE_VERSION,
        protocol_version: PROTOCOL_VERSION,
        calculation: {
          bmr_formula: "mifflin_st_jeor",
          tmb, tdee_factor: tdeeFactor, tdee,
          goal_adjustment: GOAL_KCAL_ADJUSTMENT[goal] || 0,
          final_kcal: finalKcal, data_source: dataSource,
        },
        patient_profile: {
          weight, height, age, sex,
          activity_level: activityLevel, goal,
          goal_strategy: (GOAL_STRATEGY[goal] || {}).calorie,
          macro_strategy: (GOAL_STRATEGY[goal] || {}).macro,
          restrictions: restrictions.length > 0 ? restrictions : ["nenhuma"],
          medical_conditions: medicalConditions.length > 0 ? medicalConditions : ["nenhuma"],
          disliked_foods: disliked.length > 0 ? disliked : ["nenhum"],
          cooking_preference: cookingPref || "sem preferência",
        },
        macros: { protein: finalMacros.protein, carbs: finalMacros.carbs, fat: finalMacros.fat },
      };

      return new Response(
        JSON.stringify({
          success: true,
          multiPlan: true,
          plans: generatedPlans,
          mealPlanId: generatedPlans[0]?.mealPlanId,
          plan_status: "draft_auto_generated",
          items_count: generatedPlans.reduce((s: number, p: any) => s + p.itemsCount, 0),
          tips_count: tips.length,
          explainability,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Single plan flow (original) ──
    const rawPlanItems = generatePlanFromTemplate(bestTemplate, finalKcal, finalMacros, restrictions, disliked);
    const planItems = reconcileDailyMacros(rawPlanItems, finalKcal, finalMacros);

    // ── 8. Build standardized generation_metadata ──
    const generationMetadata = buildGenerationMetadata(
      tmb, tdee, tdeeFactor, finalKcal, goal, finalMacros, weight, height,
      age, sex, activityLevel, dataSource, bestTemplate, scoredTemplates,
      restrictions, medicalConditions, cookingPref, disliked
    );

    // ── 9. Create or update meal plan ──
    let finalMealPlanId = meal_plan_id;

    if (isPipeline && !meal_plan_id) {
      const nutritionistId = body.nutritionistId;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const { data: newPlan, error: planErr } = await serviceClient
        .from("meal_plans")
        .insert({
          title: `Plano Personalizado — ${bestTemplate.name}`,
          description: `Gerado pelo Protocolo FitJourney v${ENGINE_VERSION}. Template: ${bestTemplate.name}. Meta: ${finalKcal}kcal/dia.`,
          patient_id,
          nutritionist_id: nutritionistId,
          start_date: startDate,
          end_date: endDate.toISOString().split("T")[0],
          is_active: false,
          plan_status: "draft_auto_generated",
          template_id: bestTemplate.id,
          template_slug: bestTemplate.slug,
          template_version: 1,
          generation_source: "protocol_fitjourney",
          generated_by: userId,
          generation_metadata: generationMetadata,
        })
        .select("id")
        .single();

      if (planErr || !newPlan) throw new Error("Falha ao criar plano alimentar: " + planErr?.message);
      finalMealPlanId = newPlan.id;
    } else if (finalMealPlanId) {
      const { data: existingPlan } = await serviceClient
        .from("meal_plans")
        .select("plan_status, template_id, generation_metadata")
        .eq("id", finalMealPlanId)
        .single();

      if (existingPlan?.plan_status === "published_to_patient" || existingPlan?.plan_status === "approved") {
        return new Response(JSON.stringify({
          error: "Não é possível regenerar plano já aprovado/publicado. Crie um novo plano.",
          code: "PLAN_ALREADY_APPROVED",
        }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await serviceClient.from("meal_plans").update({
        plan_status: "draft_auto_generated",
        template_id: bestTemplate.id,
        template_slug: bestTemplate.slug,
        template_version: 1,
        generation_source: "protocol_fitjourney",
        generated_by: userId,
        generation_metadata: generationMetadata,
      }).eq("id", finalMealPlanId);
    }

    if (!finalMealPlanId) {
      return new Response(JSON.stringify({ error: "meal_plan_id é obrigatório", code: "NO_PLAN_ID" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: deleteErr } = await serviceClient.from("meal_plan_items").delete().eq("meal_plan_id", finalMealPlanId);
    if (deleteErr) throw new Error("Falha ao limpar itens anteriores: " + deleteErr.message);

    const itemsToInsert = planItems.map((item: any) => ({ ...item, meal_plan_id: finalMealPlanId }));
    const { error: insertErr } = await serviceClient.from("meal_plan_items").insert(itemsToInsert);
    if (insertErr) {
      await serviceClient.from("meal_plans").update({
        plan_status: "draft",
        description: "ERRO: Itens falharam ao inserir. Regenere o plano.",
      }).eq("id", finalMealPlanId);
      throw new Error("Falha ao inserir itens (plano marcado para regeneração): " + insertErr.message);
    }

    await serviceClient.from("patient_anamnesis").update({
      computed_tmb: tmb,
      computed_kcal_target: finalKcal,
      computed_protein: finalMacros.protein,
      computed_carbs: finalMacros.carbs,
      computed_fat: finalMacros.fat,
    }).eq("id", anamnesis.id);

    const tips = generateTips(mergedAnswers);
    await serviceClient.from("patient_tips").delete().eq("user_id", patient_id);
    if (tips.length > 0) {
      await serviceClient.from("patient_tips").insert(tips.map((t) => ({ user_id: patient_id, ...t })));
    }

    await serviceClient.from("patient_timeline").insert({
      patient_id,
      event_type: "meal_plan",
      title: "Plano Alimentar Gerado — Protocolo FitJourney",
      description: `Template: "${bestTemplate.name}" | Meta: ${finalKcal}kcal/dia | ${finalMacros.protein}g prot / ${finalMacros.carbs}g carb / ${finalMacros.fat}g gord | Fonte: ${dataSource}`,
      metadata: {
        type: "plan_generated",
        protocol: PROTOCOL_VERSION,
        engine_version: ENGINE_VERSION,
        meal_plan_id: finalMealPlanId,
        template_id: bestTemplate.id,
        template_slug: bestTemplate.slug,
        template_name: bestTemplate.name,
        template_score: bestTemplate._score,
        score_breakdown: bestTemplate._breakdown,
        items_count: planItems.length,
        data_source: dataSource,
        bmr_formula: "mifflin_st_jeor",
        tmb, tdee, tdee_factor: tdeeFactor,
        kcal_target: finalKcal,
        macros: finalMacros,
        goal,
        goal_strategy: (GOAL_STRATEGY[goal] || {}).calorie,
        restrictions,
        medical_conditions: medicalConditions,
      },
      created_by: userId,
    });

    const explainability = {
      engine_version: ENGINE_VERSION,
      protocol_version: PROTOCOL_VERSION,
      calculation: {
        bmr_formula: "mifflin_st_jeor",
        tmb, tdee_factor: tdeeFactor, tdee,
        goal_adjustment: GOAL_KCAL_ADJUSTMENT[goal] || 0,
        final_kcal: finalKcal, data_source: dataSource,
      },
      patient_profile: {
        weight, height, age, sex,
        activity_level: activityLevel, goal,
        goal_strategy: (GOAL_STRATEGY[goal] || {}).calorie,
        macro_strategy: (GOAL_STRATEGY[goal] || {}).macro,
        restrictions: restrictions.length > 0 ? restrictions : ["nenhuma"],
        medical_conditions: medicalConditions.length > 0 ? medicalConditions : ["nenhuma"],
        disliked_foods: disliked.length > 0 ? disliked : ["nenhum"],
        cooking_preference: cookingPref || "sem preferência",
      },
      macros: { protein: finalMacros.protein, carbs: finalMacros.carbs, fat: finalMacros.fat },
      selected_template: {
        id: bestTemplate.id, slug: bestTemplate.slug, name: bestTemplate.name,
        category: bestTemplate.category, base_calories: bestTemplate.base_calories,
        score: bestTemplate._score, score_breakdown: bestTemplate._breakdown,
        reasons: bestTemplate._reasons,
      },
      alternative_templates: scoredTemplates.slice(1, 4).map((t: any) => ({
        id: t.id, slug: t.slug, name: t.name,
        base_calories: t.base_calories, score: t._score,
        score_breakdown: t._breakdown, reasons: t._reasons,
      })),
    };

    return new Response(
      JSON.stringify({
        success: true,
        mealPlanId: finalMealPlanId,
        plan_status: "draft_auto_generated",
        items_count: planItems.length,
        tips_count: tips.length,
        explainability,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-meal-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
