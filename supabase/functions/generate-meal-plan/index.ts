import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ──── Food database (Brazilian foods) ────
const FOODS: Record<string, { title: string; desc: string; kcal: number; p: number; c: number; f: number; tags: string[]; subs: string[] }[]> = {
  breakfast: [
    { title: "Pão integral com queijo", desc: "2 fatias de pão integral + 2 fatias de queijo branco", kcal: 250, p: 12, c: 30, f: 8, tags: ["quick"], subs: ["Tapioca com queijo", "Crepioca"] },
    { title: "Mingau de aveia com banana", desc: "40g aveia + 1 banana + 200ml leite", kcal: 320, p: 10, c: 50, f: 8, tags: ["homemade"], subs: ["Overnight oats", "Vitamina de frutas"] },
    { title: "Ovos mexidos com torrada", desc: "2 ovos mexidos + 2 torradas integrais", kcal: 280, p: 18, c: 22, f: 14, tags: ["quick", "low_carb"], subs: ["Omelete", "Ovo cozido com pão"] },
    { title: "Iogurte com granola", desc: "200ml iogurte natural + 30g granola + frutas", kcal: 260, p: 10, c: 38, f: 6, tags: ["quick"], subs: ["Açaí com granola", "Smoothie bowl"] },
  ],
  morning_snack: [
    { title: "Fruta + castanhas", desc: "1 maçã + 5 castanhas do Pará", kcal: 180, p: 4, c: 22, f: 10, tags: ["quick"], subs: ["Banana + amendoim", "Mix de nuts"] },
    { title: "Iogurte grego", desc: "170g iogurte grego + mel", kcal: 150, p: 12, c: 16, f: 4, tags: ["quick"], subs: ["Coalhada", "Vitamina"] },
    { title: "Sanduíche natural", desc: "Pão de forma + frango desfiado + alface", kcal: 200, p: 14, c: 20, f: 6, tags: ["homemade"], subs: ["Wrap integral", "Torrada com pasta de atum"] },
  ],
  lunch: [
    { title: "Arroz + feijão + frango grelhado", desc: "100g arroz + 80g feijão + 120g frango + salada", kcal: 480, p: 35, c: 55, f: 10, tags: ["homemade"], subs: ["Arroz + lentilha + peixe", "Arroz + feijão + carne moída"] },
    { title: "Macarrão integral com carne", desc: "100g macarrão integral + molho + 100g carne moída magra", kcal: 450, p: 28, c: 52, f: 12, tags: ["homemade"], subs: ["Lasanha light", "Espaguete com frango"] },
    { title: "Bowl de frango com legumes", desc: "120g frango + quinoa + legumes salteados", kcal: 420, p: 32, c: 40, f: 12, tags: ["gourmet"], subs: ["Buddha bowl", "Salada completa com proteína"] },
    { title: "Peixe assado com purê", desc: "150g tilápia + purê de batata doce + brócolis", kcal: 400, p: 30, c: 42, f: 8, tags: ["homemade"], subs: ["Salmão grelhado", "Atum com batata"] },
  ],
  afternoon_snack: [
    { title: "Banana com pasta de amendoim", desc: "1 banana + 1 colher de pasta de amendoim", kcal: 220, p: 6, c: 28, f: 10, tags: ["quick"], subs: ["Torrada com abacate", "Frutas com chocolate amargo"] },
    { title: "Batata doce com canela", desc: "100g batata doce cozida + canela", kcal: 130, p: 2, c: 28, f: 0, tags: ["quick"], subs: ["Mandioca cozida", "Milho cozido"] },
    { title: "Shake proteico", desc: "1 scoop whey + 200ml leite + 1 banana", kcal: 280, p: 26, c: 30, f: 6, tags: ["quick"], subs: ["Vitamina proteica", "Iogurte com whey"] },
  ],
  dinner: [
    { title: "Sopa de legumes com frango", desc: "Caldo de legumes com 100g frango desfiado", kcal: 280, p: 22, c: 25, f: 8, tags: ["homemade"], subs: ["Creme de abóbora", "Sopa de lentilha"] },
    { title: "Omelete de legumes + salada", desc: "3 ovos + legumes + salada verde", kcal: 300, p: 22, c: 10, f: 18, tags: ["quick", "low_carb"], subs: ["Crepioca", "Wrap de ovo"] },
    { title: "Salada completa com atum", desc: "Folhas verdes + atum + grão-de-bico + tomate", kcal: 320, p: 26, c: 22, f: 12, tags: ["quick"], subs: ["Salada com frango", "Salada com salmão"] },
  ],
  evening_snack: [
    { title: "Chá + torrada integral", desc: "Chá de camomila + 1 torrada com requeijão light", kcal: 100, p: 4, c: 14, f: 3, tags: ["quick"], subs: ["Leite quente com canela", "Chá com biscoito integral"] },
    { title: "Frutas vermelhas", desc: "100g morango + mirtilo", kcal: 60, p: 1, c: 14, f: 0, tags: ["quick"], subs: ["Gelatina zero", "Maçã assada com canela"] },
  ],
};

// ──── Tips engine ────
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
    tips.push({ tip: "Evite pular refeições — isso pode aumentar a fome e levar a escolhas ruins depois.", category: "nutrition", icon: "⏰" });
  }

  if (answers.goal === "gain_muscle") {
    tips.push({ tip: "Distribua a proteína ao longo do dia, não concentre tudo em uma refeição.", category: "nutrition", icon: "💪" });
  }

  if ((answers.restrictions || []).includes("lactose_free")) {
    tips.push({ tip: "Garanta cálcio de outras fontes: brócolis, sardinha, tofu e bebidas vegetais fortificadas.", category: "nutrition", icon: "🦴" });
  }

  if (answers.feeling === "terrible" || answers.feeling === "bad") {
    tips.push({ tip: "Mudanças graduais são mais sustentáveis. Não tente mudar tudo de uma vez — celebre cada pequena vitória!", category: "motivation", icon: "🌟" });
  }

  tips.push({ tip: "Prepare as marmitas do dia seguinte à noite. Organização é o segredo da consistência!", category: "planning", icon: "📦" });
  tips.push({ tip: "Monte seu prato colorido: quanto mais cores, mais nutrientes diferentes você está consumindo.", category: "nutrition", icon: "🌈" });

  return tips;
}

// ──── Plan generator ────
function generatePlan(
  answers: Record<string, any>,
  kcalTarget: number,
  protein: number,
  carbs: number,
  fat: number,
) {
  const mealTypes = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"] as const;
  const mealKcalSplit = {
    breakfast: 0.2,
    morning_snack: 0.1,
    lunch: 0.3,
    afternoon_snack: 0.1,
    dinner: 0.22,
    evening_snack: 0.08,
  };

  const restrictions = answers.restrictions || [];
  const cookPref = answers.cooking_preference || "any";
  const disliked = (answers.disliked_foods || "").toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean);

  const items: any[] = [];

  for (let day = 0; day < 7; day++) {
    for (const mealType of mealTypes) {
      const foods = FOODS[mealType] || [];
      let candidates = foods.filter((f) => {
        if (cookPref !== "any" && !f.tags.includes(cookPref) && !f.tags.includes("quick")) return false;
        if (restrictions.includes("vegetarian") && f.desc.toLowerCase().match(/frango|carne|atum|peixe|tilápia|salmão|sardinha/)) return false;
        if (restrictions.includes("vegan") && f.desc.toLowerCase().match(/frango|carne|atum|peixe|ovo|leite|queijo|iogurte|whey|requeijão/)) return false;
        if (restrictions.includes("gluten_free") && f.desc.toLowerCase().match(/pão|torrada|macarrão|aveia|granola|biscoito/)) return false;
        if (restrictions.includes("lactose_free") && f.desc.toLowerCase().match(/leite|queijo|iogurte|requeijão/)) return false;
        if (disliked.some((d: string) => f.title.toLowerCase().includes(d) || f.desc.toLowerCase().includes(d))) return false;
        return true;
      });

      if (candidates.length === 0) candidates = foods;

      // Pick a food (rotate by day)
      const picked = candidates[day % candidates.length];
      const targetKcal = Math.round(kcalTarget * mealKcalSplit[mealType]);
      const ratio = targetKcal / (picked.kcal || 300);

      items.push({
        meal_type: mealType,
        day_of_week: day,
        title: picked.title,
        description: `${picked.desc}\n\n🔄 Substituições:\n• ${picked.subs.join("\n• ")}`,
        calories_target: targetKcal,
        protein_target: Math.round(picked.p * ratio),
        carbs_target: Math.round(picked.c * ratio),
        fat_target: Math.round(picked.f * ratio),
      });
    }
  }

  return items;
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

    const { patient_id, meal_plan_id } = await req.json();

    // Get anamnesis
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

    const kcal = anamnesis.computed_kcal_target || 2000;
    const protein = anamnesis.computed_protein || 100;
    const carbs = anamnesis.computed_carbs || 250;
    const fat = anamnesis.computed_fat || 60;
    const answers = anamnesis.answers as Record<string, any>;

    // Generate meal plan items
    const planItems = generatePlan(answers, kcal, protein, carbs, fat);

    // Delete existing items for this plan
    await supabase.from("meal_plan_items").delete().eq("meal_plan_id", meal_plan_id);

    // Insert new items
    const itemsToInsert = planItems.map((item) => ({
      ...item,
      meal_plan_id,
    }));

    const { error: insertErr } = await supabase.from("meal_plan_items").insert(itemsToInsert);
    if (insertErr) throw insertErr;

    // Generate and insert tips
    const tips = generateTips(answers);
    // Delete old tips for this patient
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await serviceClient.from("patient_tips").delete().eq("user_id", patient_id);
    if (tips.length > 0) {
      await serviceClient.from("patient_tips").insert(
        tips.map((t) => ({ user_id: patient_id, ...t }))
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        items_count: planItems.length,
        tips_count: tips.length,
        macros: { kcal, protein, carbs, fat },
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
