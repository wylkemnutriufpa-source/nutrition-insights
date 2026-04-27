/**
 * generate-meal-plan-v2 — Motor Determinístico (FONTE DA VERDADE)
 *
 * Implementação direta de MOTOR_DETERMINISTICO.md.
 * NÃO substitui generate-meal-plan (motor antigo continua intacto).
 * Só roda quando o frontend chama esta função explicitamente.
 *
 * REGRAS INVIOLÁVEIS:
 *  - Não cria alimentos novos (reusa food_database existente).
 *  - Não altera templates antigos.
 *  - Gera APENAS day_of_week=0 (1 dia).
 *  - Multi-tenant: paciente sempre validado contra nutritionist_patients.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ===================== CONSTANTES =====================
const ENGINE_VERSION = "v2.0.0-deterministic";

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};
const GOAL_KCAL_ADJUSTMENT: Record<string, number> = {
  lose: -500,
  maintain: 0,
  gain: 400,
};
const GOAL_PROTEIN_PER_KG: Record<string, number> = {
  lose: 1.8,
  maintain: 1.6,
  gain: 2.0,
};
const MEAL_DISTRIBUTION: Record<string, number> = {
  breakfast: 0.20,
  morning_snack: 0.10,
  lunch: 0.30,
  afternoon_snack: 0.10,
  dinner: 0.25,
  evening_snack: 0.05,
};
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  morning_snack: "Lanche da Manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da Tarde",
  dinner: "Jantar",
  evening_snack: "Ceia",
};
const MEAL_ORDER = [
  "breakfast", "morning_snack", "lunch",
  "afternoon_snack", "dinner", "evening_snack",
];

interface TItem { name: string; aliases?: string[]; grams: number; }
const MEAL_TEMPLATES: Record<string, Record<string, TItem[]>> = {
  breakfast: {
    lose: [
      { name: "Ovo inteiro cozido", aliases: ["Ovo cozido"], grams: 50 },
      { name: "Pão integral", grams: 40 },
      { name: "Mamão papaia", aliases: ["Mamão"], grams: 120 },
      { name: "Café coado sem açúcar", aliases: ["Café coado"], grams: 150 },
    ],
    maintain: [
      { name: "Ovo inteiro cozido", grams: 100 },
      { name: "Pão integral", grams: 60 },
      { name: "Mamão papaia", aliases: ["Mamão"], grams: 150 },
      { name: "Café coado sem açúcar", grams: 150 },
    ],
    gain: [
      { name: "Ovo inteiro cozido", grams: 100 },
      { name: "Pão integral", grams: 80 },
      { name: "Banana prata", aliases: ["Banana nanica", "Banana"], grams: 100 },
      { name: "Aveia em flocos", aliases: ["Aveia em flocos crua", "Aveia"], grams: 40 },
      { name: "Pasta de amendoim", aliases: ["Pasta de amendoim integral"], grams: 15 },
    ],
  },
  morning_snack: {
    lose: [
      { name: "Iogurte natural integral", aliases: ["Iogurte natural"], grams: 150 },
      { name: "Maçã", aliases: ["Maçã fuji"], grams: 100 },
    ],
    maintain: [
      { name: "Iogurte grego natural", aliases: ["Iogurte grego"], grams: 150 },
      { name: "Banana prata", aliases: ["Banana"], grams: 100 },
      { name: "Aveia em flocos", aliases: ["Aveia"], grams: 20 },
    ],
    gain: [
      { name: "Iogurte grego natural", aliases: ["Iogurte grego"], grams: 200 },
      { name: "Banana prata", aliases: ["Banana"], grams: 120 },
      { name: "Granola", grams: 40 },
      { name: "Pasta de amendoim", grams: 15 },
    ],
  },
  lunch: {
    lose: [
      { name: "Arroz integral cozido", grams: 80 },
      { name: "Feijão carioca cozido", grams: 80 },
      { name: "Peito de frango grelhado", aliases: ["Peito de frango desossado grelhado", "Frango peito grelhado"], grams: 120 },
      { name: "Alface crespa", aliases: ["Alface"], grams: 40 },
      { name: "Tomate", grams: 50 },
      { name: "Azeite de oliva extra virgem", aliases: ["Azeite de oliva", "Azeite"], grams: 5 },
    ],
    maintain: [
      { name: "Arroz integral cozido", grams: 120 },
      { name: "Feijão carioca cozido", grams: 100 },
      { name: "Peito de frango grelhado", aliases: ["Peito de frango desossado grelhado"], grams: 150 },
      { name: "Brócolis cozido", grams: 80 },
      { name: "Cenoura cozida", grams: 50 },
      { name: "Azeite de oliva extra virgem", aliases: ["Azeite de oliva"], grams: 8 },
    ],
    gain: [
      { name: "Arroz branco cozido", grams: 180 },
      { name: "Feijão carioca cozido", grams: 120 },
      { name: "Patinho grelhado", aliases: ["Patinho", "Carne moída magra grelhada"], grams: 180 },
      { name: "Batata doce cozida", grams: 100 },
      { name: "Brócolis cozido", grams: 80 },
      { name: "Azeite de oliva extra virgem", aliases: ["Azeite de oliva"], grams: 10 },
    ],
  },
  afternoon_snack: {
    lose: [
      { name: "Maçã", aliases: ["Maçã fuji"], grams: 100 },
      { name: "Amêndoas", grams: 15 },
    ],
    maintain: [
      { name: "Banana prata", aliases: ["Banana"], grams: 100 },
      { name: "Pasta de amendoim", grams: 15 },
      { name: "Whey protein (scoop 30g)", aliases: ["Whey protein (dose)", "Whey protein (concentrado)", "Whey"], grams: 30 },
    ],
    gain: [
      { name: "Pão integral", grams: 60 },
      { name: "Pasta de amendoim", grams: 25 },
      { name: "Banana prata", aliases: ["Banana"], grams: 100 },
      { name: "Whey protein (scoop 30g)", aliases: ["Whey protein (dose)", "Whey protein (concentrado)"], grams: 30 },
    ],
  },
  dinner: {
    lose: [
      { name: "Tilápia grelhada", grams: 150 },
      { name: "Batata doce cozida", grams: 100 },
      { name: "Brócolis cozido", grams: 100 },
      { name: "Azeite de oliva extra virgem", aliases: ["Azeite de oliva"], grams: 5 },
    ],
    maintain: [
      { name: "Tilápia grelhada", grams: 180 },
      { name: "Batata doce cozida", grams: 150 },
      { name: "Abobrinha cozida", aliases: ["Abobrinha"], grams: 100 },
      { name: "Azeite de oliva extra virgem", aliases: ["Azeite de oliva"], grams: 8 },
    ],
    gain: [
      { name: "Salmão grelhado", grams: 180 },
      { name: "Arroz integral cozido", grams: 150 },
      { name: "Brócolis cozido", grams: 100 },
      { name: "Azeite de oliva extra virgem", aliases: ["Azeite de oliva"], grams: 10 },
    ],
  },
  evening_snack: {
    lose: [{ name: "Iogurte natural integral", aliases: ["Iogurte natural"], grams: 100 }],
    maintain: [
      { name: "Iogurte grego natural", aliases: ["Iogurte grego"], grams: 120 },
      { name: "Chia", aliases: ["Chia (sementes)"], grams: 8 },
    ],
    gain: [
      { name: "Iogurte grego natural", aliases: ["Iogurte grego"], grams: 150 },
      { name: "Castanha do Pará", grams: 15 },
    ],
  },
};

// ===================== CÁLCULO =====================
function r1(n: number) { return Math.round(n * 10) / 10; }
function r2(n: number) { return Math.round(n * 100) / 100; }

function calcAge(birth?: string | null): number {
  if (!birth) return 30;
  const d = new Date(birth);
  if (isNaN(d.getTime())) return 30;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

function calcMetrics(p: any) {
  const w = Number(p.weight_kg) || 0;
  const h = Number(p.height_cm) || 0;
  const sex = p.sex === "F" ? "F" : "M";
  const age = p.age ?? calcAge(p.birth_date);
  const activity = p.activity_level || "moderate";
  const goal = p.goal || "maintain";

  const base = 10 * w + 6.25 * h - 5 * age;
  const tmb = r1(sex === "M" ? base + 5 : base - 161);
  const get = r1(tmb * (ACTIVITY_MULTIPLIERS[activity] ?? 1.55));
  const target = r1(get + (GOAL_KCAL_ADJUSTMENT[goal] ?? 0));
  const protein = r1(w * (GOAL_PROTEIN_PER_KG[goal] ?? 1.6));
  const fat = r1((target * 0.25) / 9);
  const carb = r1(Math.max(0, (target - protein * 4 - fat * 9) / 4));
  const imc = h > 0 ? r1(w / Math.pow(h / 100, 2)) : 0;

  return { age, imc, tmb, get, target_kcal: target, protein_g: protein, carb_g: carb, fat_g: fat, goal };
}

function resolveFood(item: TItem, foods: any[]): any | null {
  const cands = [item.name, ...(item.aliases ?? [])];
  for (const c of cands) {
    const t = c.trim().toLowerCase();
    const ex = foods.find((f) => String(f.name).trim().toLowerCase() === t);
    if (ex) return ex;
  }
  for (const c of cands) {
    const n = c.trim().toLowerCase();
    const p = foods.find((f) => String(f.name).trim().toLowerCase().includes(n));
    if (p) return p;
  }
  return null;
}

function buildPlan(metrics: any, foods: any[]) {
  const goal = metrics.goal;
  const meals: any[] = [];
  const unresolved: string[] = [];

  for (const mt of MEAL_ORDER) {
    const targetKcal = metrics.target_kcal * MEAL_DISTRIBUTION[mt];
    const tpl = MEAL_TEMPLATES[mt]?.[goal] ?? MEAL_TEMPLATES[mt]?.maintain ?? [];
    const resolved: Array<{ food: any; baseG: number }> = [];
    let baseKcal = 0;
    for (const t of tpl) {
      const f = resolveFood(t, foods);
      if (!f) { unresolved.push(`${mt}:${t.name}`); continue; }
      resolved.push({ food: f, baseG: t.grams });
      baseKcal += Number(f.calories) * (t.grams / 100);
    }
    let items: any[] = [];
    if (baseKcal > 0) {
      const scale = Math.max(0.4, Math.min(targetKcal / baseKcal, 2.0));
      items = resolved.map(({ food, baseG }) => {
        const grams = Math.round(baseG * scale);
        const f = grams / 100;
        return {
          food_id: food.id,
          food_name: food.name,
          grams,
          kcal: r1(Number(food.calories) * f),
          protein: r2(Number(food.protein) * f),
          carb: r2(Number(food.carbs) * f),
          fat: r2(Number(food.fat) * f),
          fiber: r2(Number(food.fiber ?? 0) * f),
        };
      }).filter((i) => i.grams > 0);
    }
    const totals = items.reduce(
      (a, i) => ({
        kcal: a.kcal + i.kcal, protein: a.protein + i.protein,
        carb: a.carb + i.carb, fat: a.fat + i.fat, fiber: a.fiber + i.fiber,
      }),
      { kcal: 0, protein: 0, carb: 0, fat: 0, fiber: 0 }
    );
    meals.push({
      type: mt,
      name: MEAL_LABELS[mt],
      target_kcal: r1(targetKcal),
      items,
      totals: {
        kcal: r1(totals.kcal), protein: r1(totals.protein),
        carb: r1(totals.carb), fat: r1(totals.fat), fiber: r1(totals.fiber),
      },
    });
  }
  return { meals, unresolved };
}

// ===================== HANDLER =====================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: uerr } = await supabase.auth.getUser();
    if (uerr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const {
      patient_id,
      patient_input,
      dry_run = false,
      plan_title,
      existing_plan_id,
    } = body ?? {};

    if (!patient_id) return json({ error: "patient_id required" }, 400);

    // Multi-tenant guard: profissional só acessa seus pacientes.
    const { data: link, error: lerr } = await supabase
      .from("nutritionist_patients")
      .select("tenant_id, status")
      .eq("nutritionist_id", userId)
      .eq("patient_id", patient_id)
      .maybeSingle();
    if (lerr || !link || link.status !== "active") {
      return json({ error: "Patient not linked to this professional" }, 403);
    }

    // Carrega anamnese / dados clínicos do paciente
    let patientData = patient_input ?? null;
    if (!patientData) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("weight_kg, height_cm, sex, birth_date, activity_level, goal")
        .eq("id", patient_id)
        .maybeSingle();
      patientData = profile ?? {};
    }

    if (!patientData.weight_kg || !patientData.height_cm) {
      return json({
        error: "Anamnese incompleta",
        details: "weight_kg e height_cm são obrigatórios para o motor V2",
      }, 422);
    }

    const metrics = calcMetrics(patientData);

    // Busca alimentos disponíveis (globais + custom do nutricionista)
    const { data: foods, error: ferr } = await supabase
      .from("food_database")
      .select("id, name, calories, protein, carbs, fat, fiber")
      .or(`nutritionist_id.is.null,nutritionist_id.eq.${userId}`);
    if (ferr) return json({ error: "Falha ao carregar alimentos", details: ferr.message }, 500);

    const built = buildPlan(metrics, foods ?? []);

    if (dry_run) {
      return json({
        engine_version: ENGINE_VERSION,
        metrics,
        meals: built.meals,
        unresolved_items: built.unresolved,
      });
    }

    // Persiste como meal_plan + meal_plan_items (1 dia, day_of_week=0)
    let planId = existing_plan_id as string | undefined;
    if (!planId) {
      const { data: newPlan, error: cperr } = await supabase
        .from("meal_plans")
        .insert({
          patient_id,
          nutritionist_id: userId,
          tenant_id: link.tenant_id,
          title: plan_title ?? `Plano Determinístico V2 — ${new Date().toLocaleDateString("pt-BR")}`,
          plan_status: "draft",
          is_active: false,
          start_date: new Date().toISOString().split("T")[0],
          generation_source: "engine_v2",
          editor_version: ENGINE_VERSION,
          generation_metadata: {
            engine_version: ENGINE_VERSION,
            metrics,
            unresolved_items: built.unresolved,
          },
          total_target_calories: metrics.target_kcal,
          total_target_protein: metrics.protein_g,
          total_target_carbs: metrics.carb_g,
          total_target_fat: metrics.fat_g,
          global_calories_target: metrics.target_kcal,
          global_protein_target: metrics.protein_g,
          global_carbs_target: metrics.carb_g,
          global_fat_target: metrics.fat_g,
        })
        .select("id")
        .single();
      if (cperr || !newPlan) return json({ error: "Falha ao criar plano", details: cperr?.message }, 500);
      planId = newPlan.id;
    }

    const itemsToInsert = built.meals.map((m) => ({
      meal_plan_id: planId,
      tenant_id: link.tenant_id,
      meal_type: m.type,
      title: m.name,
      description: m.items
        .map((it: any) => `${it.food_name} — ${it.grams}g (${it.kcal} kcal)`)
        .join("\n"),
      calories_target: Math.round(m.totals.kcal),
      protein_target: m.totals.protein,
      carbs_target: m.totals.carb,
      fat_target: m.totals.fat,
      day_of_week: 0,
      item_origin: "engine_v2",
      is_manually_edited: false,
      edit_metadata: {
        engine_version: ENGINE_VERSION,
        target_kcal: m.target_kcal,
        foods: m.items,
      },
    }));

    const { error: ierr } = await supabase
      .from("meal_plan_items")
      .insert(itemsToInsert);
    if (ierr) return json({ error: "Falha ao inserir refeições", details: ierr.message }, 500);

    return json({
      success: true,
      engine_version: ENGINE_VERSION,
      plan_id: planId,
      metrics,
      meals: built.meals,
      unresolved_items: built.unresolved,
    });
  } catch (e: any) {
    console.error("[generate-meal-plan-v2] fatal", e);
    return json({ error: "Internal error", details: String(e?.message ?? e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
