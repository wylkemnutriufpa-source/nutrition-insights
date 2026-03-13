import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ──── Meal type labels ────
const MEAL_TYPE_ORDER = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"];
const MEAL_KCAL_SPLIT: Record<string, number> = {
  breakfast: 0.2,
  morning_snack: 0.1,
  lunch: 0.3,
  afternoon_snack: 0.1,
  dinner: 0.22,
  evening_snack: 0.08,
};

// ──── Map anamnesis goal to template conditions ────
function mapGoalToConditions(goal: string): string[] {
  const map: Record<string, string[]> = {
    lose_weight: ["emagrecimento", "sobrepeso", "obesidade", "deficit"],
    gain_muscle: ["hipertrofia", "ganho_massa", "atleta"],
    maintain: ["manutencao", "equilibrio", "reeducacao"],
    gain_weight: ["baixo peso", "ganho de massa", "hipercalórico"],
    improve_health: ["anti_inflamatorio", "longevidade", "cardiovascular"],
    athletic_performance: ["corrida", "ciclismo", "resistência", "endurance"],
  };
  return map[goal] || ["manutencao", "equilibrio"];
}

// ──── Score a template against patient data ────
function scoreTemplate(
  template: any,
  goal: string,
  restrictions: string[],
  conditions: string[],
  kcalTarget: number,
): number {
  let score = 0;
  const templateConditions = (template.conditions || []) as string[];
  const templateTags = (template.tags || []) as string[];
  const goalConditions = mapGoalToConditions(goal);

  // Goal match (highest weight)
  for (const gc of goalConditions) {
    if (templateConditions.some((c: string) => c.toLowerCase().includes(gc.toLowerCase()))) score += 10;
    if (templateTags.some((t: string) => t.toLowerCase().includes(gc.toLowerCase()))) score += 5;
  }

  // Medical conditions match
  for (const cond of conditions) {
    if (templateConditions.some((c: string) => c.toLowerCase().includes(cond.toLowerCase()))) score += 15;
    if (templateTags.some((t: string) => t.toLowerCase().includes(cond.toLowerCase()))) score += 8;
  }

  // Dietary restrictions match
  if (restrictions.includes("vegetarian") || restrictions.includes("vegan")) {
    if (template.slug === "vegana" || template.slug === "vegetariana") score += 20;
  }
  if (restrictions.includes("gluten_free")) {
    if (templateTags.includes("sem_gluten")) score += 10;
  }
  if (restrictions.includes("lactose_free")) {
    if (templateTags.includes("sem_lactose")) score += 10;
  }

  // Calorie proximity (closer = better)
  const calDiff = Math.abs((template.base_calories || 2000) - kcalTarget);
  if (calDiff < 200) score += 5;
  else if (calDiff < 400) score += 3;
  else if (calDiff < 600) score += 1;

  return score;
}

// ──── Filter foods based on dietary restrictions ────
function isFoodAllowed(foodName: string, foodDesc: string, restrictions: string[]): boolean {
  const text = `${foodName} ${foodDesc}`.toLowerCase();
  if (restrictions.includes("vegetarian") && text.match(/frango|carne|atum|peixe|tilápia|salmão|sardinha|patinho|boi|porco|peru|bacon/)) return false;
  if (restrictions.includes("vegan") && text.match(/frango|carne|atum|peixe|ovo|leite|queijo|iogurte|whey|requeijão|mel|manteiga|ricota|cottage|kefir|coalhada|peru|salmão|sardinha|patinho|boi/)) return false;
  if (restrictions.includes("gluten_free") && text.match(/pão|torrada|macarrão|aveia|granola|biscoito|trigo|wrap/)) return false;
  if (restrictions.includes("lactose_free") && text.match(/leite|queijo|iogurte|requeijão|coalhada|kefir|manteiga|ricota|cottage/)) return false;
  return true;
}

// ──── Check disliked foods ────
function isDisliked(foodName: string, foodDesc: string, disliked: string[]): boolean {
  const text = `${foodName} ${foodDesc}`.toLowerCase();
  return disliked.some(d => text.includes(d));
}

// ──── Generate plan items from a template ────
function generatePlanFromTemplate(
  template: any,
  kcalTarget: number,
  protein: number,
  carbs: number,
  fat: number,
  restrictions: string[],
  disliked: string[],
): any[] {
  const meals = (template.meals || []) as any[];
  const items: any[] = [];
  const templateBaseKcal = template.base_calories || 2000;
  const kcalRatio = kcalTarget / templateBaseKcal;

  for (let day = 0; day < 7; day++) {
    for (const mealTemplate of meals) {
      const mealType = mealTemplate.meal_type || "lunch";
      const foods = (mealTemplate.foods || []) as any[];
      const targetKcal = Math.round(kcalTarget * (MEAL_KCAL_SPLIT[mealType] || 0.15));

      // Filter foods by restrictions and dislikes
      let allowedFoods = foods.filter((f: any) =>
        isFoodAllowed(f.name || "", f.portion || "", restrictions) &&
        !isDisliked(f.name || "", f.portion || "", disliked)
      );

      // If all foods filtered out, use substitutions
      if (allowedFoods.length === 0) {
        for (const f of foods) {
          const subs = (f.substitutions || []) as string[];
          for (const sub of subs) {
            if (isFoodAllowed(sub, "", restrictions) && !isDisliked(sub, "", disliked)) {
              allowedFoods.push({ ...f, name: sub, portion: f.portion, _substituted: true });
              break;
            }
          }
        }
      }

      // Still empty? fallback to original
      if (allowedFoods.length === 0) allowedFoods = foods;

      // For day variation: rotate substitutions on some days
      const dayFoods = allowedFoods.map((f: any, idx: number) => {
        if (day > 0 && day % 2 === 0 && (f.substitutions || []).length > 0 && !f._substituted) {
          const subIdx = (day - 1) % f.substitutions.length;
          const subName = f.substitutions[subIdx];
          if (isFoodAllowed(subName, "", restrictions) && !isDisliked(subName, "", disliked)) {
            return { ...f, name: subName, _rotated: true };
          }
        }
        return f;
      });

      // Build description
      const foodLines = dayFoods.map((f: any) => `• ${f.name} — ${f.portion || ""}`).join("\n");
      const subsLines = dayFoods
        .filter((f: any) => (f.substitutions || []).length > 0 && !f._rotated)
        .map((f: any) => `• ${f.name}: ${f.substitutions.slice(0, 2).join(", ")}`)
        .join("\n");

      const description = `${foodLines}${subsLines ? `\n\n🔄 Substituições:\n${subsLines}` : ""}`;

      // Calculate macros scaled to target
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

// ──── Tips engine (deterministic from anamnesis) ────
function generateTips(answers: Record<string, any>): { tip: string; category: string; icon: string }[] {
  const tips: { tip: string; category: string; icon: string }[] = [];

  if (answers.water_intake && answers.water_intake < 8) {
    tips.push({ tip: "Você bebe menos de 2L de água por dia. Tente aumentar gradualmente — coloque lembretes no celular!", category: "hydration", icon: "💧" });
  }

  if (answers.sleep_time && answers.wake_time) {
    const sleep = parseInt(answers.sleep_time.split(":")[0]);
    const wake = parseInt(answers.wake_time.split(":")[0]);
    const hours = sleep > wake ? (24 - sleep + wake) : (wake - sleep);
    if (hours < 7) {
      tips.push({ tip: "Você está dormindo menos de 7h. Dormir bem é essencial para controlar a fome e manter o metabolismo ativo.", category: "sleep", icon: "😴" });
    }
  }

  if (answers.activity_level === "sedentary") {
    tips.push({ tip: "Comece com caminhadas de 20min, 3x por semana. Pequenos passos fazem grande diferença!", category: "exercise", icon: "🚶" });
  }

  if (answers.goal === "lose_weight") {
    tips.push({ tip: "Foque em comer devagar e mastigar bem. Isso ajuda na saciedade e na digestão.", category: "nutrition", icon: "🍽️" });
  }

  if (answers.goal === "gain_muscle") {
    tips.push({ tip: "Distribua a proteína ao longo do dia, não concentre tudo em uma refeição.", category: "nutrition", icon: "💪" });
  }

  if (answers.meals_per_day && answers.meals_per_day < 4) {
    tips.push({ tip: "Tente fazer pelo menos 4 refeições por dia para manter o metabolismo ativo e evitar compulsão.", category: "nutrition", icon: "🕐" });
  }

  if (answers.bowel_function === "irregular" || answers.bowel_function === "constipated") {
    tips.push({ tip: "Aumente o consumo de fibras (verduras, frutas com casca, aveia) e beba mais água para regularizar o intestino.", category: "digestion", icon: "🌿" });
  }

  return tips;
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

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    // Support both entry paths
    const patient_id = body.patient_id || body.patientId;
    const meal_plan_id = body.meal_plan_id;
    const isPipeline = body.isPipeline || false;

    // ── 1. Get anamnesis ──
    const { data: anamnesis } = await supabase
      .from("patient_anamnesis")
      .select("*")
      .eq("user_id", patient_id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!anamnesis) {
      return new Response(JSON.stringify({ error: "Anamnese não encontrada para este paciente" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 2. Get physical assessment (priority for macros) ──
    const { data: physicalAssessment } = await serviceClient
      .from("physical_assessments")
      .select("calories_target, protein_target, carbs_target, fat_target, tdee, bmr, weight, body_fat_percentage")
      .eq("patient_id", patient_id)
      .order("assessment_date", { ascending: false })
      .limit(1)
      .single();

    // ── 3. Calculate macros: physical assessment > anamnesis > defaults ──
    const kcal = physicalAssessment?.calories_target || anamnesis.computed_kcal_target || 2000;
    const protein = physicalAssessment?.protein_target || anamnesis.computed_protein || 100;
    const carbs = physicalAssessment?.carbs_target || anamnesis.computed_carbs || 250;
    const fat = physicalAssessment?.fat_target || anamnesis.computed_fat || 60;
    const answers = (anamnesis.answers || {}) as Record<string, any>;
    const dataSource = physicalAssessment?.calories_target ? "physical_assessment" : "anamnesis";

    // Pipeline overrides
    const pipelineOverrides = isPipeline ? {
      cooking_preference: body.cookingPreference,
      food_preferences: body.foodPreferences,
      wake_time: body.wakeTime,
      sleep_time: body.sleepTime,
      meal_count: body.mealCount,
    } : {};
    const mergedAnswers = { ...answers, ...pipelineOverrides };

    // ── 4. Fetch ALL active diet templates from DB ──
    const { data: templates, error: tplErr } = await serviceClient
      .from("diet_templates")
      .select("*")
      .eq("is_active", true);

    if (tplErr || !templates || templates.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum template de dieta disponível" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 5. Score and select best template ──
    const goal = mergedAnswers.goal || "maintain";
    const restrictions = mergedAnswers.restrictions || [];
    const medicalConditions = mergedAnswers.medical_conditions || mergedAnswers.health_conditions || [];
    const disliked = (mergedAnswers.disliked_foods || "").toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean);

    const scoredTemplates = templates
      .map((t: any) => ({ ...t, _score: scoreTemplate(t, goal, restrictions, medicalConditions, kcal) }))
      .sort((a: any, b: any) => b._score - a._score);

    const bestTemplate = scoredTemplates[0];

    // ── 6. Generate plan items from selected template ──
    const planItems = generatePlanFromTemplate(
      bestTemplate,
      kcal,
      protein,
      carbs,
      fat,
      restrictions,
      disliked,
    );

    // ── 7. Handle plan creation for pipeline mode ──
    let finalMealPlanId = meal_plan_id;

    if (isPipeline && !meal_plan_id) {
      const nutritionistId = body.nutritionistId;
      const { data: newPlan, error: planErr } = await serviceClient
        .from("meal_plans")
        .insert({
          title: `Plano Personalizado — ${bestTemplate.name}`,
          description: `Gerado automaticamente com base na anamnese. Template: ${bestTemplate.name}. Meta calórica: ${kcal}kcal.`,
          patient_id,
          nutritionist_id: nutritionistId,
          start_date: new Date().toISOString().split("T")[0],
          is_active: true,
        })
        .select("id")
        .single();

      if (planErr || !newPlan) throw new Error("Falha ao criar plano alimentar");
      finalMealPlanId = newPlan.id;
    }

    if (!finalMealPlanId) {
      return new Response(JSON.stringify({ error: "meal_plan_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 8. Delete existing items and insert new ones ──
    await supabase.from("meal_plan_items").delete().eq("meal_plan_id", finalMealPlanId);

    const itemsToInsert = planItems.map((item: any) => ({
      ...item,
      meal_plan_id: finalMealPlanId,
    }));

    const { error: insertErr } = await supabase.from("meal_plan_items").insert(itemsToInsert);
    if (insertErr) throw insertErr;

    // ── 9. Generate deterministic tips ──
    const tips = generateTips(mergedAnswers);
    await serviceClient.from("patient_tips").delete().eq("user_id", patient_id);
    if (tips.length > 0) {
      await serviceClient.from("patient_tips").insert(
        tips.map((t) => ({ user_id: patient_id, ...t }))
      );
    }

    // ── 10. Add timeline event ──
    await serviceClient.from("patient_timeline").insert({
      patient_id,
      event_type: "meal_plan",
      title: "Plano Alimentar Gerado",
      description: `Plano baseado no template "${bestTemplate.name}" com meta de ${kcal}kcal/dia. Fonte dos dados: ${dataSource === "physical_assessment" ? "avaliação física" : "anamnese"}.`,
      metadata: {
        type: "plan_generated",
        meal_plan_id: finalMealPlanId,
        template_used: bestTemplate.slug,
        template_name: bestTemplate.name,
        items_count: planItems.length,
        data_source: dataSource,
      },
      created_by: user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        mealPlanId: finalMealPlanId,
        items_count: planItems.length,
        tips_count: tips.length,
        macros: { kcal, protein, carbs, fat },
        data_source: dataSource,
        template_used: {
          slug: bestTemplate.slug,
          name: bestTemplate.name,
          score: bestTemplate._score,
          category: bestTemplate.category,
        },
        alternatives: scoredTemplates.slice(1, 4).map((t: any) => ({
          slug: t.slug,
          name: t.name,
          score: t._score,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-meal-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
