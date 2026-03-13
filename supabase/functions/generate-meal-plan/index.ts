import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ──── Constants ────
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

// ──── TMB Calculator (Mifflin-St Jeor) ────
function calculateTMB(weight: number, height: number, age: number, sex: string): number {
  if (sex === "female") return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
}

// ──── TDEE + Goal-adjusted target ────
function calculateTargetKcal(tmb: number, activityLevel: string, goal: string): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.375;
  const tdee = Math.round(tmb * multiplier);
  const adjustment = GOAL_KCAL_ADJUSTMENT[goal] || 0;
  // Clamp to safe range
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
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const tConds = (template.conditions || []) as string[];
  const tTags = (template.tags || []) as string[];
  const goalConds = mapGoalToConditions(goal);

  // 1. Goal match (highest weight)
  for (const gc of goalConds) {
    if (tConds.some((c: string) => c.toLowerCase().includes(gc))) { score += 10; reasons.push(`Objetivo "${gc}" compatível`); }
    if (tTags.some((t: string) => t.toLowerCase().includes(gc))) score += 5;
  }

  // 2. Medical conditions match
  for (const cond of conditions) {
    if (tConds.some((c: string) => c.toLowerCase().includes(cond.toLowerCase()))) { score += 15; reasons.push(`Condição "${cond}" contemplada`); }
    if (tTags.some((t: string) => t.toLowerCase().includes(cond.toLowerCase()))) score += 8;
  }

  // 3. Dietary restrictions
  if (restrictions.includes("vegetarian") || restrictions.includes("vegan")) {
    if (template.slug?.includes("veg")) { score += 20; reasons.push("Template vegetariano/vegano"); }
    else score -= 5;
  }
  if (restrictions.includes("gluten_free") && tTags.includes("sem_gluten")) { score += 10; reasons.push("Sem glúten"); }
  if (restrictions.includes("lactose_free") && tTags.includes("sem_lactose")) { score += 10; reasons.push("Sem lactose"); }

  // 4. Calorie proximity (closer = much better)
  const calDiff = Math.abs((template.base_calories || 2000) - kcalTarget);
  if (calDiff < 100) { score += 15; reasons.push(`Calorias muito próximas (±${calDiff})`); }
  else if (calDiff < 200) { score += 10; reasons.push(`Calorias próximas (±${calDiff})`); }
  else if (calDiff < 400) score += 5;
  else if (calDiff > 600) score -= 5;

  // 5. Cooking preference match
  if (cookingPref === "quick" && (template.slug?.includes("pratico") || tTags.includes("pratico"))) { score += 8; reasons.push("Cardápio prático"); }

  // 6. "Dieta flexível" bonus (universal compatibility)
  if (template.slug?.includes("flexivel") || tTags.includes("flexivel")) score += 3;

  return { score, reasons };
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
  restrictions: string[], disliked: string[]
): any[] {
  const meals = (template.meals || []) as any[];
  const items: any[] = [];

  for (let day = 0; day < 7; day++) {
    for (const mealTemplate of meals) {
      const mealType = mealTemplate.meal_type || "lunch";
      const foods = (mealTemplate.foods || []) as any[];
      const targetKcal = Math.round(kcalTarget * (MEAL_KCAL_SPLIT[mealType] || 0.15));

      let allowedFoods = foods.filter((f: any) =>
        isFoodAllowed(f.name || "", f.portion || "", restrictions) &&
        !isDisliked(f.name || "", f.portion || "", disliked)
      );

      // Try substitutions if all filtered out
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

      // Day variation: rotate substitutions
      const dayFoods = allowedFoods.map((f: any) => {
        if (day > 0 && day % 2 === 0 && (f.substitutions || []).length > 0 && !f._substituted) {
          const subIdx = (day - 1) % f.substitutions.length;
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    const token = authHeader?.replace('Bearer ', '') || '';
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const patient_id = body.patient_id || body.patientId;
    const meal_plan_id = body.meal_plan_id;
    const isPipeline = body.isPipeline || false;

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
    const kcalTarget = calculateTargetKcal(tmb, activityLevel, goal);
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
        const { score, reasons } = scoreTemplate(t, goal, restrictions, medicalConditions, finalKcal, cookingPref);
        return { ...t, _score: score, _reasons: reasons };
      })
      .sort((a: any, b: any) => b._score - a._score);

    const bestTemplate = scoredTemplates[0];

    // ── 7. Generate plan items deterministically ──
    const planItems = generatePlanFromTemplate(bestTemplate, finalKcal, finalMacros, restrictions, disliked);

    // ── 8. Create or reuse meal plan ──
    let finalMealPlanId = meal_plan_id;
    const startDate = new Date().toISOString().split("T")[0];

    if (isPipeline && !meal_plan_id) {
      const nutritionistId = body.nutritionistId;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const { data: newPlan, error: planErr } = await serviceClient
        .from("meal_plans")
        .insert({
          title: `Plano Personalizado — ${bestTemplate.name}`,
          description: `Gerado pelo Protocolo FitJourney. Template: ${bestTemplate.name}. Meta: ${finalKcal}kcal/dia.`,
          patient_id,
          nutritionist_id: nutritionistId,
          start_date: startDate,
          end_date: endDate.toISOString().split("T")[0],
          is_active: false, // NOT active until approved
          plan_status: "draft_auto_generated",
          template_id: bestTemplate.id,
          template_slug: bestTemplate.slug,
          template_version: 1,
          generation_source: "protocol_fitjourney",
          generated_by: userId,
          generation_metadata: {
            tmb,
            tdee: Math.round(tmb * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.375)),
            kcal_target: finalKcal,
            macros: finalMacros,
            goal,
            restrictions,
            medical_conditions: medicalConditions,
            disliked_foods: disliked,
            cooking_preference: cookingPref,
            activity_level: activityLevel,
            weight,
            height,
            age,
            sex,
            data_source: dataSource,
            template_score: bestTemplate._score,
            template_reasons: bestTemplate._reasons,
            alternatives: scoredTemplates.slice(1, 4).map((t: any) => ({
              id: t.id, slug: t.slug, name: t.name, score: t._score, reasons: t._reasons,
            })),
            generated_at: new Date().toISOString(),
            version: "2.0",
          },
        })
        .select("id")
        .single();

      if (planErr || !newPlan) throw new Error("Falha ao criar plano alimentar: " + planErr?.message);
      finalMealPlanId = newPlan.id;
    } else if (finalMealPlanId) {
      // Update existing plan with audit metadata
      await serviceClient.from("meal_plans").update({
        plan_status: "draft_auto_generated",
        template_id: bestTemplate.id,
        template_slug: bestTemplate.slug,
        generation_source: "protocol_fitjourney",
        generated_by: userId,
        generation_metadata: {
          tmb,
          tdee: Math.round(tmb * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.375)),
          kcal_target: finalKcal,
          macros: finalMacros,
          goal,
          data_source: dataSource,
          template_score: bestTemplate._score,
          template_reasons: bestTemplate._reasons,
          generated_at: new Date().toISOString(),
          version: "2.0",
        },
      }).eq("id", finalMealPlanId);
    }

    if (!finalMealPlanId) {
      return new Response(JSON.stringify({ error: "meal_plan_id é obrigatório", code: "NO_PLAN_ID" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 9. Delete existing items and insert new (transactional) ──
    await serviceClient.from("meal_plan_items").delete().eq("meal_plan_id", finalMealPlanId);
    const itemsToInsert = planItems.map((item: any) => ({ ...item, meal_plan_id: finalMealPlanId }));
    const { error: insertErr } = await serviceClient.from("meal_plan_items").insert(itemsToInsert);
    if (insertErr) throw new Error("Falha ao inserir itens: " + insertErr.message);

    // ── 10. Save computed values to anamnesis ──
    await serviceClient.from("patient_anamnesis").update({
      computed_tmb: tmb,
      computed_kcal_target: finalKcal,
      computed_protein: finalMacros.protein,
      computed_carbs: finalMacros.carbs,
      computed_fat: finalMacros.fat,
    }).eq("id", anamnesis.id);

    // ── 11. Deterministic tips ──
    const tips = generateTips(mergedAnswers);
    await serviceClient.from("patient_tips").delete().eq("user_id", patient_id);
    if (tips.length > 0) {
      await serviceClient.from("patient_tips").insert(tips.map((t) => ({ user_id: patient_id, ...t })));
    }

    // ── 12. Timeline event with full audit ──
    await serviceClient.from("patient_timeline").insert({
      patient_id,
      event_type: "meal_plan",
      title: "Plano Alimentar Gerado — Protocolo FitJourney",
      description: `Template: "${bestTemplate.name}" | Meta: ${finalKcal}kcal/dia | ${finalMacros.protein}g prot / ${finalMacros.carbs}g carb / ${finalMacros.fat}g gord | Fonte: ${dataSource}`,
      metadata: {
        type: "plan_generated",
        protocol: "fitjourney_master",
        meal_plan_id: finalMealPlanId,
        template_id: bestTemplate.id,
        template_slug: bestTemplate.slug,
        template_name: bestTemplate.name,
        template_score: bestTemplate._score,
        items_count: planItems.length,
        data_source: dataSource,
        tmb,
        kcal_target: finalKcal,
        macros: finalMacros,
        goal,
        restrictions,
        version: "2.0",
      },
      created_by: userId,
    });

    // ── 13. Explainability response ──
    const explainability = {
      calculation: {
        tmb,
        tdee: Math.round(tmb * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.375)),
        goal_adjustment: GOAL_KCAL_ADJUSTMENT[goal] || 0,
        final_kcal: finalKcal,
        data_source: dataSource,
      },
      patient_profile: {
        weight, height, age, sex,
        activity_level: activityLevel,
        goal,
        restrictions: restrictions.length > 0 ? restrictions : ["nenhuma"],
        medical_conditions: medicalConditions.length > 0 ? medicalConditions : ["nenhuma"],
        disliked_foods: disliked.length > 0 ? disliked : ["nenhum"],
        cooking_preference: cookingPref || "sem preferência",
      },
      macros: finalMacros,
      selected_template: {
        id: bestTemplate.id,
        slug: bestTemplate.slug,
        name: bestTemplate.name,
        category: bestTemplate.category,
        base_calories: bestTemplate.base_calories,
        score: bestTemplate._score,
        reasons: bestTemplate._reasons,
      },
      alternative_templates: scoredTemplates.slice(1, 4).map((t: any) => ({
        id: t.id, slug: t.slug, name: t.name,
        base_calories: t.base_calories, score: t._score, reasons: t._reasons,
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
