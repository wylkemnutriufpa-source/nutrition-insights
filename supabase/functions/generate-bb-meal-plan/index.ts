import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MEAL_KCAL_SPLIT as CANONICAL_MEAL_KCAL_SPLIT } from "../_shared/food-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ──── BB-specific constants ────
const ENGINE_VERSION = "2.1.0";
const PROTOCOL_VERSION = "biquini_branco_v1";

const BB_PHASE_CONFIG: Record<number, {
  name: string;
  deficit: number;
  protein_per_kg: number;
  carb_pct: number;
  fat_pct: number;
  carb_timing: string;
  preferred_styles: string[];
  description: string;
}> = {
  1: {
    name: "Reset Metabólico",
    deficit: 0,
    protein_per_kg: 1.8,
    carb_pct: 0.40,
    fat_pct: 0.30,
    carb_timing: "distributed",
    preferred_styles: ["flexivel", "equilibrado", "mediterranea", "reeducacao"],
    description: "Adaptação metabólica sem déficit. Foco em qualidade alimentar e reeducação.",
  },
  2: {
    name: "Déficit Estratégico",
    deficit: 400,
    protein_per_kg: 2.0,
    carb_pct: 0.35,
    fat_pct: 0.30,
    carb_timing: "pre_post_training",
    preferred_styles: ["low_carb", "flexivel", "proteica", "deficit"],
    description: "Déficit moderado com proteína elevada. Carboidratos periódicos ao treino.",
  },
  3: {
    name: "Definição Corporal",
    deficit: 500,
    protein_per_kg: 2.2,
    carb_pct: 0.30,
    fat_pct: 0.30,
    carb_timing: "pre_post_training",
    preferred_styles: ["low_carb", "cetogenica", "proteica", "deficit"],
    description: "Déficit agressivo com proteína máxima. Carbs restritos ao treino.",
  },
  4: {
    name: "Manutenção Inteligente",
    deficit: 0,
    protein_per_kg: 1.8,
    carb_pct: 0.42,
    fat_pct: 0.28,
    carb_timing: "distributed",
    preferred_styles: ["flexivel", "equilibrado", "mediterranea", "manutencao"],
    description: "Manutenção dos resultados com flexibilidade alimentar controlada.",
  },
};

// MEAL_KCAL_SPLIT imported from _shared/food-rules.ts (canonical source)
const MEAL_KCAL_SPLIT = CANONICAL_MEAL_KCAL_SPLIT;

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// ──── Core calculators (same as Master) ────
function calculateTMB(weight: number, height: number, age: number, sex: string): number {
  if (sex === "female") return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
}

function calculateTDEE(tmb: number, activityLevel: string): number {
  return Math.round(tmb * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.375));
}

// ──── BB-specific: Phase-aware calorie + macro calculation ────
function calculateBBTargets(tdee: number, weight: number, phase: number) {
  const config = BB_PHASE_CONFIG[phase] || BB_PHASE_CONFIG[1];
  const kcalTarget = Math.max(1000, Math.min(3500, tdee - config.deficit));
  
  const protein = Math.round(weight * config.protein_per_kg);
  const proteinKcal = protein * 4;
  const remaining = kcalTarget - proteinKcal;
  const carbs = Math.round((remaining * (config.carb_pct / (config.carb_pct + config.fat_pct))) / 4);
  const fat = Math.round((remaining * (config.fat_pct / (config.carb_pct + config.fat_pct))) / 9);

  return { kcalTarget, macros: { protein, carbs, fat }, config };
}

// ──── BB-specific template scoring (boosts BB-friendly styles) ────
function scoreBBTemplate(
  template: any, phase: number, restrictions: string[],
  conditions: string[], kcalTarget: number, cookingPref: string
): { score: number; breakdown: Record<string, number>; reasons: string[] } {
  const config = BB_PHASE_CONFIG[phase] || BB_PHASE_CONFIG[1];
  let styleScore = 0, restrictionScore = 0, calorieScore = 0, clinicalScore = 0, preferenceScore = 0;
  const reasons: string[] = [];
  const tConds = (template.conditions || []) as string[];
  const tTags = (template.tags || []) as string[];
  const slug = (template.slug || "").toLowerCase();

  // 1. BB phase style match (highest weight)
  for (const style of config.preferred_styles) {
    if (slug.includes(style)) { styleScore += 15; reasons.push(`Estilo "${style}" ideal p/ Fase ${phase}`); }
    if (tTags.some((t: string) => t.toLowerCase().includes(style))) styleScore += 8;
    if (tConds.some((c: string) => c.toLowerCase().includes(style))) styleScore += 5;
  }

  // BB-specific condition boosts
  const bbConditions = ["emagrecimento", "deficit", "definicao", "transformacao"];
  for (const bc of bbConditions) {
    if (tConds.some((c: string) => c.toLowerCase().includes(bc))) { clinicalScore += 8; }
    if (tTags.some((t: string) => t.toLowerCase().includes(bc))) clinicalScore += 4;
  }

  // 2. Medical conditions
  for (const cond of conditions) {
    if (tConds.some((c: string) => c.toLowerCase().includes(cond.toLowerCase()))) { clinicalScore += 15; reasons.push(`Condição "${cond}" contemplada`); }
    if (tTags.some((t: string) => t.toLowerCase().includes(cond.toLowerCase()))) clinicalScore += 8;
  }

  // 3. Dietary restrictions
  if (restrictions.includes("vegetarian") || restrictions.includes("vegan")) {
    if (slug.includes("veg")) { restrictionScore += 20; reasons.push("Template vegetariano/vegano"); }
    else restrictionScore -= 5;
  }
  if (restrictions.includes("gluten_free") && tTags.includes("sem_gluten")) { restrictionScore += 10; }
  if (restrictions.includes("lactose_free") && tTags.includes("sem_lactose")) { restrictionScore += 10; }

  // 4. Calorie proximity
  const calDiff = Math.abs((template.base_calories || 2000) - kcalTarget);
  if (calDiff < 100) { calorieScore += 15; reasons.push(`Calorias próximas (±${calDiff})`); }
  else if (calDiff < 200) calorieScore += 10;
  else if (calDiff < 400) calorieScore += 5;
  else if (calDiff > 600) calorieScore -= 5;

  // 5. Cooking preference
  if (cookingPref === "quick" && (slug.includes("pratico") || tTags.includes("pratico"))) { preferenceScore += 8; }

  const score = styleScore + restrictionScore + calorieScore + clinicalScore + preferenceScore;
  return { score, breakdown: { style_match: styleScore, restriction_match: restrictionScore, calorie_match: calorieScore, clinical_match: clinicalScore, preference_match: preferenceScore }, reasons };
}

// ──── Food filtering (reused from Master) ────
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

// ──── Generate plan items ────
function generatePlanFromTemplate(
  template: any, kcalTarget: number, macros: { protein: number; carbs: number; fat: number },
  restrictions: string[], disliked: string[], phase: number
): any[] {
  const meals = (template.meals || []) as any[];
  const items: any[] = [];
  const config = BB_PHASE_CONFIG[phase] || BB_PHASE_CONFIG[1];

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
          description: `${config.name} — Refeição a ser personalizada.\n🔹 Timing carb: ${config.carb_timing}`,
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
      const description = `👙 ${config.name}\n${foodLines}${subsLines ? `\n\n🔄 Substituições:\n${subsLines}` : ""}\n🔹 Timing carb: ${config.carb_timing}`;

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

// ──── Visual Resolution Engine (server-side, same as generate-meal-plan) ────
const VISUAL_CARB_KEYWORDS = new Set([
  "arroz", "batata", "macarrao", "feijao", "pure", "mandioca", "inhame",
  "legumes", "salada", "brocolis", "macaxeira", "farinha", "farofa",
]);

const VISUAL_GENERIC_TITLES = new Set([
  "almoco", "jantar", "cafe da manha", "lanche",
  "lanche da manha", "lanche da tarde", "ceia",
  "refeicao", "marmita", "almoco reforcado", "cafe da manha reforcado",
  "lanche reforcado",
]);

function normalize(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, " ");
}

function findBestVisualAliasBB(text: string, aliasMap: Map<string, string>): string | null {
  let bestAlias: string | null = null;
  let bestLength = 0;
  for (const [alias, itemId] of aliasMap) {
    if (alias.length < 3) continue;
    if (text === alias) return itemId;
    if (alias.length > bestLength) {
      const idx = text.indexOf(alias);
      if (idx !== -1) {
        const before = idx === 0 || text[idx - 1] === ' ';
        const after = (idx + alias.length) >= text.length || text[idx + alias.length] === ' ';
        if (before && after) { bestAlias = alias; bestLength = alias.length; }
      }
    }
  }
  return bestAlias ? aliasMap.get(bestAlias)! : null;
}

function resolveVisualFromDescriptionBB(title: string, description: string, aliasMap: Map<string, string>): string | null {
  const normTitle = normalize(title);
  if (!VISUAL_GENERIC_TITLES.has(normTitle)) {
    if (aliasMap.has(normTitle)) return aliasMap.get(normTitle)!;
    const titleMatch = findBestVisualAliasBB(normTitle, aliasMap);
    if (titleMatch) return titleMatch;
  }
  const lines = description.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('Substituiç') || trimmed.includes('🔄')) break;
    if (!trimmed.startsWith('•') && !trimmed.startsWith('-')) continue;
    const normLine = normalize(trimmed);
    const phraseMatch = findBestVisualAliasBB(normLine, aliasMap);
    if (phraseMatch) return phraseMatch;
  }
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('Substituiç') || trimmed.includes('🔄')) break;
    if (!trimmed.startsWith('•') && !trimmed.startsWith('-')) continue;
    const words = normalize(trimmed).split(/\s+/);
    for (const word of words) {
      if (VISUAL_CARB_KEYWORDS.has(word) || word.length < 3) continue;
      if (aliasMap.has(word)) return aliasMap.get(word)!;
    }
  }
  return null;
}

async function loadVisualAliasMap(client: any): Promise<Map<string, string>> {
  const { data } = await client.from("meal_visual_aliases").select("library_item_id, normalized_alias");
  const map = new Map<string, string>();
  if (data) {
    for (const row of data) {
      if (!map.has(row.normalized_alias)) map.set(row.normalized_alias, row.library_item_id);
    }
  }
  return map;
}

// ──── Main handler ────
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
    const bb_phase = body.bb_phase || 1;
    const enrollment_id = body.enrollment_id;

    if (!patient_id) {
      return new Response(JSON.stringify({ error: "patient_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!BB_PHASE_CONFIG[bb_phase]) {
      return new Response(JSON.stringify({ error: `Fase ${bb_phase} inválida. Use 1-4.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve tenant_id for meal_plans (NOT NULL constraint)
    const { data: tenantProfile } = await serviceClient
      .from("profiles")
      .select("tenant_id")
      .eq("user_id", userId)
      .maybeSingle();
    const resolvedTenantId = tenantProfile?.tenant_id;

    // ── 1. Load BB settings from site_settings ──
    const { data: bbSettingsRow } = await serviceClient
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "protocol_bb_settings")
      .maybeSingle();

    const bbSettings = bbSettingsRow?.setting_value || {};
    if (bbSettings.is_enabled === false) {
      return new Response(JSON.stringify({ error: "Protocolo Biquíni Branco está desativado", code: "BB_DISABLED" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Override phase config with admin settings if present
    const phaseConfig = { ...BB_PHASE_CONFIG[bb_phase] };
    if (bb_phase === 1 && bbSettings.deficit_phase1 !== undefined) phaseConfig.deficit = bbSettings.deficit_phase1;
    if (bb_phase === 2 && bbSettings.deficit_phase2 !== undefined) phaseConfig.deficit = bbSettings.deficit_phase2;
    if (bb_phase === 3 && bbSettings.deficit_phase3 !== undefined) phaseConfig.deficit = bbSettings.deficit_phase3;
    if (bb_phase === 4) phaseConfig.deficit = 0; // maintenance always 0

    // ── 2. Get completed anamnesis ──
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

    // ── 3. Weight + height validation ──
    const weight = body.weight || answers.weight;
    const height = body.height || answers.height;
    if (!weight || weight < 20 || !height || height < 80) {
      return new Response(JSON.stringify({ error: "Peso e altura válidos são obrigatórios", code: "BODY_DATA_MISSING" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Calculate BB-specific targets ──
    const age = answers.age || 30;
    const sex = answers.sex || answers.gender || "female"; // BB default: female
    const activityLevel = answers.activity_level || "moderate";

    const tmb = calculateTMB(weight, height, age, sex);
    const tdeeFactor = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55;
    const tdee = calculateTDEE(tmb, activityLevel);

    // Apply phase-specific deficit override
    const bbTargets = calculateBBTargets(tdee, weight, bb_phase);
    // Override deficit if admin changed it
    const finalKcal = Math.max(1000, Math.min(3500, tdee - phaseConfig.deficit));
    const finalMacros = {
      protein: Math.round(weight * phaseConfig.protein_per_kg),
      carbs: bbTargets.macros.carbs,
      fat: bbTargets.macros.fat,
    };
    // Recalculate carbs/fat with final kcal
    const proteinKcal = finalMacros.protein * 4;
    const remaining = finalKcal - proteinKcal;
    finalMacros.carbs = Math.round((remaining * (phaseConfig.carb_pct / (phaseConfig.carb_pct + phaseConfig.fat_pct))) / 4);
    finalMacros.fat = Math.round((remaining * (phaseConfig.fat_pct / (phaseConfig.carb_pct + phaseConfig.fat_pct))) / 9);

    // ── 5. Check physical assessment override ──
    const { data: physicalAssessment } = await serviceClient
      .from("physical_assessments")
      .select("calories_target, protein_target, tdee, bmr")
      .eq("patient_id", patient_id)
      .order("assessment_date", { ascending: false })
      .limit(1)
      .single();

    // For BB, we prefer our phase calculation but use physical assessment as reference
    const dataSource = physicalAssessment?.calories_target ? "physical_assessment_bb_override" : "bb_phase_calculated";

    // ── 6. Fetch and score templates ──
    // Prioritize official_v2 templates; fall back to all active if none exist
    let { data: templates, error: tplErr } = await serviceClient
      .from("diet_templates")
      .select("*")
      .eq("is_active", true)
      .eq("template_generation", "official_v2");

    if (!tplErr && (!templates || templates.length === 0)) {
      // Fallback: use all active templates if no official_v2 exist
      const fallback = await serviceClient
        .from("diet_templates")
        .select("*")
        .eq("is_active", true);
      templates = fallback.data;
      tplErr = fallback.error;
    }

    if (tplErr || !templates || templates.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum template de dieta ativo", code: "NO_TEMPLATES" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const restrictions = answers.restrictions || [];
    const medicalConditions = answers.medical_conditions || answers.health_conditions || [];
    const disliked = (answers.disliked_foods || "").toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean);
    const cookingPref = answers.cooking_preference || "";

    const scoredTemplates = templates
      .map((t: any) => {
        const { score, breakdown, reasons } = scoreBBTemplate(t, bb_phase, restrictions, medicalConditions, finalKcal, cookingPref);
        return { ...t, _score: score, _breakdown: breakdown, _reasons: reasons };
      })
      .sort((a: any, b: any) => b._score - a._score);

    const bestTemplate = scoredTemplates[0];

    // ── 7. Generate plan items ──
    const planItems = generatePlanFromTemplate(bestTemplate, finalKcal, finalMacros, restrictions, disliked, bb_phase);

    // ── 8. Build BB-specific generation metadata ──
    const generationMetadata = {
      engine_version: ENGINE_VERSION,
      protocol_version: PROTOCOL_VERSION,
      bmr_formula: "mifflin_st_jeor",
      bmr_value: tmb,
      tdee_factor: tdeeFactor,
      tdee_value: tdee,
      bb_phase,
      bb_phase_name: phaseConfig.name,
      bb_deficit_applied: phaseConfig.deficit,
      bb_protein_per_kg: phaseConfig.protein_per_kg,
      bb_carb_timing: phaseConfig.carb_timing,
      calorie_target: finalKcal,
      macros: { protein_g: finalMacros.protein, carbs_g: finalMacros.carbs, fat_g: finalMacros.fat },
      phase_adjustments: {
        protein_multiplier: phaseConfig.protein_per_kg,
        carb_timing: phaseConfig.carb_timing,
        carb_pct: phaseConfig.carb_pct,
        fat_pct: phaseConfig.fat_pct,
      },
      patient_data: { weight, height, age, sex, activity_level: activityLevel },
      template_selected: { id: bestTemplate.id, slug: bestTemplate.slug, name: bestTemplate.name },
      template_score: bestTemplate._score,
      score_breakdown: bestTemplate._breakdown,
      alternatives: scoredTemplates.slice(1, 4).map((t: any) => ({ id: t.id, slug: t.slug, name: t.name, score: t._score })),
      data_source: dataSource,
      restrictions,
      medical_conditions: medicalConditions,
      cooking_preference: cookingPref,
      disliked_foods: disliked,
      bb_settings_applied: {
        deficit_phase1: bbSettings.deficit_phase1,
        deficit_phase2: bbSettings.deficit_phase2,
        deficit_phase3: bbSettings.deficit_phase3,
        min_adherence_transition: bbSettings.min_adherence_transition,
        phase_duration_days: bbSettings.phase_duration_days,
      },
      generated_at: new Date().toISOString(),
    };

    // ── 9. Create meal plan ──
    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (bbSettings.phase_duration_days || 30));

    const planStatus = bbSettings.require_approval ? "draft_auto_generated" : "approved";

    const { data: newPlan, error: planErr } = await serviceClient
      .from("meal_plans")
      .insert({
        title: `👙 BB Fase ${bb_phase} — ${phaseConfig.name}`,
        description: `Protocolo Biquíni Branco v${ENGINE_VERSION}. Fase ${bb_phase}: ${phaseConfig.name}. Meta: ${finalKcal}kcal/dia. Déficit: ${phaseConfig.deficit}kcal.`,
        patient_id,
        nutritionist_id: userId,
        start_date: startDate,
        end_date: endDate.toISOString().split("T")[0],
        is_active: false,
        plan_status: planStatus,
        template_id: bestTemplate.id,
        template_slug: bestTemplate.slug,
        template_version: 1,
        generation_source: "protocol_biquini_branco",
        generated_by: userId,
        generation_metadata: generationMetadata,
        tenant_id: resolvedTenantId,
      })
      .select("id")
      .single();

    if (planErr || !newPlan) throw new Error("Falha ao criar plano BB: " + planErr?.message);

    // ── 10. Insert plan items ──
    const itemsToInsert = planItems.map((item: any) => ({ ...item, meal_plan_id: newPlan.id }));
    const { error: insertErr } = await serviceClient.from("meal_plan_items").insert(itemsToInsert);
    if (insertErr) {
      await serviceClient.from("meal_plans").update({
        plan_status: "draft",
        description: "ERRO: Itens falharam ao inserir. Regenere o plano.",
      }).eq("id", newPlan.id);
      throw new Error("Falha ao inserir itens BB: " + insertErr.message);
    }

    // ── 10.5. Resolve visual associations ──
    const aliasMap = await loadVisualAliasMap(serviceClient);
    const { data: insertedItems } = await serviceClient
      .from("meal_plan_items")
      .select("id, title, description")
      .eq("meal_plan_id", newPlan.id);

    let visualResolved = 0;
    if (insertedItems) {
      for (const item of insertedItems) {
        const visualId = resolveVisualFromDescriptionBB(item.title || "", item.description || "", aliasMap);
        if (visualId) {
          await serviceClient
            .from("meal_plan_items")
            .update({ visual_library_item_id: visualId })
            .eq("id", item.id);
          visualResolved++;
        }
      }
    }
    console.log(`BB Plan ${newPlan.id}: ${visualResolved}/${planItems.length} items visually resolved`);

    await serviceClient.from("patient_anamnesis").update({
      computed_tmb: tmb,
      computed_kcal_target: finalKcal,
      computed_protein: finalMacros.protein,
      computed_carbs: finalMacros.carbs,
      computed_fat: finalMacros.fat,
    }).eq("id", anamnesis.id);

    // ── 12. Timeline event ──
    await serviceClient.from("patient_timeline").insert({
      patient_id,
      event_type: "meal_plan",
      title: `👙 Plano BB Fase ${bb_phase} — ${phaseConfig.name}`,
      description: `Protocolo BB: ${phaseConfig.name} | Meta: ${finalKcal}kcal/dia | Déficit: ${phaseConfig.deficit}kcal | ${finalMacros.protein}g prot / ${finalMacros.carbs}g carb / ${finalMacros.fat}g gord`,
      metadata: {
        type: "bb_plan_generated",
        protocol: PROTOCOL_VERSION,
        engine_version: ENGINE_VERSION,
        meal_plan_id: newPlan.id,
        bb_phase,
        bb_phase_name: phaseConfig.name,
        bb_deficit: phaseConfig.deficit,
        template_id: bestTemplate.id,
        template_slug: bestTemplate.slug,
        template_name: bestTemplate.name,
        template_score: bestTemplate._score,
        items_count: planItems.length,
        data_source: dataSource,
        tmb, tdee, kcal_target: finalKcal,
        macros: finalMacros,
      },
      created_by: userId,
    });

    // ── 13. Notify if enrollment ──
    if (enrollment_id) {
      await serviceClient.from("notifications").insert({
        user_id: patient_id,
        title: `👙 Novo plano — Fase ${bb_phase}: ${phaseConfig.name}`,
        message: `Seu plano alimentar para a Fase ${bb_phase} do Projeto Biquíni Branco foi gerado. ${bbSettings.require_approval ? "Aguarde aprovação do profissional." : "Confira agora!"}`,
        type: "program",
        action_url: "/client/dashboard",
      });
    }

    // ── 14. Response ──
    return new Response(
      JSON.stringify({
        success: true,
        mealPlanId: newPlan.id,
        plan_status: planStatus,
        items_count: planItems.length,
        explainability: {
          engine_version: ENGINE_VERSION,
          protocol_version: PROTOCOL_VERSION,
          bb_phase,
          bb_phase_name: phaseConfig.name,
          calculation: {
            bmr_formula: "mifflin_st_jeor",
            tmb, tdee_factor: tdeeFactor, tdee,
            bb_deficit: phaseConfig.deficit,
            final_kcal: finalKcal,
            data_source: dataSource,
          },
          macros: finalMacros,
          phase_config: {
            protein_per_kg: phaseConfig.protein_per_kg,
            carb_pct: phaseConfig.carb_pct,
            fat_pct: phaseConfig.fat_pct,
            carb_timing: phaseConfig.carb_timing,
          },
          selected_template: {
            id: bestTemplate.id, slug: bestTemplate.slug, name: bestTemplate.name,
            score: bestTemplate._score, breakdown: bestTemplate._breakdown, reasons: bestTemplate._reasons,
          },
          alternative_templates: scoredTemplates.slice(1, 4).map((t: any) => ({
            id: t.id, slug: t.slug, name: t.name, score: t._score, reasons: t._reasons,
          })),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("generate-bb-meal-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
