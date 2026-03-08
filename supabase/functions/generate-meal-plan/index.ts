import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ──── Food database (Brazilian foods) with tags for AI matching ────
interface FoodItem {
  title: string;
  desc: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  tags: string[];
  subs: string[];
  benefits: string[];  // AI-matchable benefit keywords
}

const FOODS: Record<string, FoodItem[]> = {
  breakfast: [
    { title: "Pão integral com queijo", desc: "2 fatias de pão integral + 2 fatias de queijo branco", kcal: 250, p: 12, c: 30, f: 8, tags: ["quick"], subs: ["Tapioca com queijo", "Crepioca"], benefits: ["fibra", "energia_matinal", "saciedade"] },
    { title: "Mingau de aveia com banana", desc: "40g aveia + 1 banana + 200ml leite", kcal: 320, p: 10, c: 50, f: 8, tags: ["homemade"], subs: ["Overnight oats", "Vitamina de frutas"], benefits: ["fibra", "digestão", "energia_sustentada", "saciedade"] },
    { title: "Ovos mexidos com torrada", desc: "2 ovos mexidos + 2 torradas integrais", kcal: 280, p: 18, c: 22, f: 14, tags: ["quick", "low_carb"], subs: ["Omelete", "Ovo cozido com pão"], benefits: ["proteína", "saciedade", "low_carb", "massa_muscular"] },
    { title: "Iogurte com granola", desc: "200ml iogurte natural + 30g granola + frutas", kcal: 260, p: 10, c: 38, f: 6, tags: ["quick"], subs: ["Açaí com granola", "Smoothie bowl"], benefits: ["probiótico", "digestão", "imunidade", "praticidade"] },
    { title: "Smoothie verde proteico", desc: "Espinafre + banana + whey + leite vegetal", kcal: 290, p: 22, c: 32, f: 6, tags: ["quick"], subs: ["Vitamina verde", "Shake detox"], benefits: ["anti_inflamatório", "energia", "proteína", "micronutrientes"] },
    { title: "Tapioca com ovo e tomate", desc: "1 tapioca + 2 ovos + tomate picado", kcal: 270, p: 16, c: 28, f: 10, tags: ["quick", "gluten_free"], subs: ["Crepioca", "Panqueca de banana"], benefits: ["sem_glúten", "proteína", "energia_rápida"] },
  ],
  morning_snack: [
    { title: "Fruta + castanhas", desc: "1 maçã + 5 castanhas do Pará", kcal: 180, p: 4, c: 22, f: 10, tags: ["quick"], subs: ["Banana + amendoim", "Mix de nuts"], benefits: ["selênio", "antioxidante", "saciedade", "gordura_boa"] },
    { title: "Iogurte grego", desc: "170g iogurte grego + mel", kcal: 150, p: 12, c: 16, f: 4, tags: ["quick"], subs: ["Coalhada", "Vitamina"], benefits: ["probiótico", "proteína", "digestão", "saciedade"] },
    { title: "Sanduíche natural", desc: "Pão de forma + frango desfiado + alface", kcal: 200, p: 14, c: 20, f: 6, tags: ["homemade"], subs: ["Wrap integral", "Torrada com pasta de atum"], benefits: ["proteína", "fibra", "saciedade"] },
    { title: "Mix de frutas secas e sementes", desc: "30g mix de frutas secas + sementes de abóbora", kcal: 160, p: 5, c: 18, f: 8, tags: ["quick"], subs: ["Barra de cereais caseira", "Trail mix"], benefits: ["energia_sustentada", "fibra", "minerais", "praticidade"] },
  ],
  lunch: [
    { title: "Arroz + feijão + frango grelhado", desc: "100g arroz + 80g feijão + 120g frango + salada", kcal: 480, p: 35, c: 55, f: 10, tags: ["homemade"], subs: ["Arroz + lentilha + peixe", "Arroz + feijão + carne moída"], benefits: ["proteína", "ferro", "fibra", "completo"] },
    { title: "Macarrão integral com carne", desc: "100g macarrão integral + molho + 100g carne moída magra", kcal: 450, p: 28, c: 52, f: 12, tags: ["homemade"], subs: ["Lasanha light", "Espaguete com frango"], benefits: ["fibra", "proteína", "energia_sustentada"] },
    { title: "Bowl de frango com legumes", desc: "120g frango + quinoa + legumes salteados", kcal: 420, p: 32, c: 40, f: 12, tags: ["gourmet"], subs: ["Buddha bowl", "Salada completa com proteína"], benefits: ["proteína", "micronutrientes", "anti_inflamatório", "low_carb"] },
    { title: "Peixe assado com purê", desc: "150g tilápia + purê de batata doce + brócolis", kcal: 400, p: 30, c: 42, f: 8, tags: ["homemade"], subs: ["Salmão grelhado", "Atum com batata"], benefits: ["ômega3", "anti_inflamatório", "proteína", "digestão"] },
    { title: "Salada completa com grão-de-bico", desc: "Folhas verdes + grão-de-bico + ovo cozido + azeite", kcal: 380, p: 22, c: 35, f: 16, tags: ["quick"], subs: ["Salada com lentilha", "Tabule com proteína"], benefits: ["fibra", "proteína_vegetal", "saciedade", "digestão"] },
    { title: "Strogonoff light de frango", desc: "120g frango + creme de leite light + arroz integral", kcal: 460, p: 30, c: 48, f: 14, tags: ["homemade"], subs: ["Frango ao molho mostarda", "Escondidinho light"], benefits: ["proteína", "conforto", "saciedade"] },
  ],
  afternoon_snack: [
    { title: "Banana com pasta de amendoim", desc: "1 banana + 1 colher de pasta de amendoim", kcal: 220, p: 6, c: 28, f: 10, tags: ["quick"], subs: ["Torrada com abacate", "Frutas com chocolate amargo"], benefits: ["energia_rápida", "gordura_boa", "saciedade", "pré_treino"] },
    { title: "Batata doce com canela", desc: "100g batata doce cozida + canela", kcal: 130, p: 2, c: 28, f: 0, tags: ["quick"], subs: ["Mandioca cozida", "Milho cozido"], benefits: ["energia_sustentada", "fibra", "anti_inflamatório", "pré_treino"] },
    { title: "Shake proteico", desc: "1 scoop whey + 200ml leite + 1 banana", kcal: 280, p: 26, c: 30, f: 6, tags: ["quick"], subs: ["Vitamina proteica", "Iogurte com whey"], benefits: ["proteína", "massa_muscular", "recuperação", "pós_treino"] },
    { title: "Torrada com abacate e ovo", desc: "2 torradas + ½ abacate + 1 ovo cozido", kcal: 260, p: 12, c: 22, f: 16, tags: ["quick"], subs: ["Guacamole com torrada", "Abacate com granola"], benefits: ["gordura_boa", "saciedade", "energia_sustentada", "hormonal"] },
  ],
  dinner: [
    { title: "Sopa de legumes com frango", desc: "Caldo de legumes com 100g frango desfiado", kcal: 280, p: 22, c: 25, f: 8, tags: ["homemade"], subs: ["Creme de abóbora", "Sopa de lentilha"], benefits: ["digestão", "leve", "hidratação", "anti_inflamatório", "sono"] },
    { title: "Omelete de legumes + salada", desc: "3 ovos + legumes + salada verde", kcal: 300, p: 22, c: 10, f: 18, tags: ["quick", "low_carb"], subs: ["Crepioca", "Wrap de ovo"], benefits: ["low_carb", "proteína", "saciedade", "leve"] },
    { title: "Salada completa com atum", desc: "Folhas verdes + atum + grão-de-bico + tomate", kcal: 320, p: 26, c: 22, f: 12, tags: ["quick"], subs: ["Salada com frango", "Salada com salmão"], benefits: ["ômega3", "proteína", "leve", "digestão"] },
    { title: "Frango grelhado com legumes", desc: "120g frango + abobrinha + cenoura refogada", kcal: 310, p: 28, c: 18, f: 10, tags: ["homemade"], subs: ["Peixe com legumes", "Carne magra com salada"], benefits: ["proteína", "micronutrientes", "leve", "massa_muscular"] },
  ],
  evening_snack: [
    { title: "Chá + torrada integral", desc: "Chá de camomila + 1 torrada com requeijão light", kcal: 100, p: 4, c: 14, f: 3, tags: ["quick"], subs: ["Leite quente com canela", "Chá com biscoito integral"], benefits: ["sono", "relaxamento", "leve", "digestão"] },
    { title: "Frutas vermelhas", desc: "100g morango + mirtilo", kcal: 60, p: 1, c: 14, f: 0, tags: ["quick"], subs: ["Gelatina zero", "Maçã assada com canela"], benefits: ["antioxidante", "anti_inflamatório", "leve", "imunidade"] },
    { title: "Leite morno com cúrcuma", desc: "200ml leite + ½ colher de cúrcuma + mel", kcal: 120, p: 6, c: 16, f: 4, tags: ["quick"], subs: ["Golden milk vegetal", "Chá de ervas com mel"], benefits: ["anti_inflamatório", "sono", "imunidade", "relaxamento"] },
  ],
};

// ──── AI Insight → Benefit keywords mapping ────
function mapInsightsToBenefits(insights: any): string[] {
  const benefits: string[] = [];
  const focuses = [
    ...(insights.nutrition_focus || []),
    ...(insights.behavior_focus || []),
    ...(insights.movement_focus || []),
    ...(insights.main_pains || []),
  ].map((s: string) => s.toLowerCase());

  const text = focuses.join(" ");

  // Map common focus areas to food benefit tags
  if (text.match(/proteín|massa muscular|hipertrofia|ganho/)) benefits.push("proteína", "massa_muscular");
  if (text.match(/fibra|intestin|digestão|constipação/)) benefits.push("fibra", "digestão", "probiótico");
  if (text.match(/inflama|dor|articular|inchaço/)) benefits.push("anti_inflamatório", "ômega3");
  if (text.match(/sono|dormir|insônia|descanso/)) benefits.push("sono", "relaxamento");
  if (text.match(/energia|dispos|cansaço|fadiga/)) benefits.push("energia_sustentada", "energia_rápida");
  if (text.match(/saciedade|fome|compulsão|ansiedade/)) benefits.push("saciedade", "gordura_boa", "fibra");
  if (text.match(/imunidade|defesa|gripe/)) benefits.push("imunidade", "antioxidante", "micronutrientes");
  if (text.match(/emagre|perda|gordura corporal|déficit/)) benefits.push("low_carb", "saciedade", "leve");
  if (text.match(/hidrat|água|líquido/)) benefits.push("hidratação");
  if (text.match(/treino|exercício|atividade física|musculação/)) benefits.push("pré_treino", "pós_treino", "recuperação");
  if (text.match(/hormonal|tireóide|menopausa/)) benefits.push("hormonal", "anti_inflamatório", "micronutrientes");
  if (text.match(/glúten/)) benefits.push("sem_glúten");

  return [...new Set(benefits)];
}

// ──── Score food based on AI insights ────
function scoreFoodForInsights(food: FoodItem, priorityBenefits: string[]): number {
  if (priorityBenefits.length === 0) return 0;
  let score = 0;
  for (const b of food.benefits) {
    if (priorityBenefits.includes(b)) score += 2;
  }
  return score;
}

// ──── Generate personalized note based on insights ────
function generateInsightNote(food: FoodItem, insights: any): string {
  const matchedBenefits = food.benefits.filter(b => {
    const text = JSON.stringify(insights).toLowerCase();
    return text.includes(b.replace("_", " "));
  });

  if (matchedBenefits.length === 0) return "";

  const benefitLabels: Record<string, string> = {
    proteína: "🔋 Rico em proteína para seus objetivos",
    fibra: "🌾 Fonte de fibra para saúde digestiva",
    digestão: "🫄 Favorece a digestão",
    anti_inflamatório: "🍃 Propriedades anti-inflamatórias",
    saciedade: "✅ Aumenta a saciedade",
    energia_sustentada: "⚡ Energia de longa duração",
    sono: "😴 Favorece o sono reparador",
    ômega3: "🐟 Fonte de ômega-3",
    imunidade: "🛡️ Fortalece a imunidade",
    low_carb: "📉 Baixo carboidrato",
    massa_muscular: "💪 Suporte para massa muscular",
    probiótico: "🦠 Rico em probióticos",
    gordura_boa: "🥑 Gorduras saudáveis",
    antioxidante: "🫐 Rico em antioxidantes",
  };

  const notes = matchedBenefits
    .map(b => benefitLabels[b])
    .filter(Boolean)
    .slice(0, 2);

  return notes.length > 0 ? `\n\n💡 Personalizado para você:\n${notes.join("\n")}` : "";
}

// ──── Plan generator (now insight-aware) ────
function generatePlan(
  answers: Record<string, any>,
  kcalTarget: number,
  _protein: number,
  _carbs: number,
  _fat: number,
  insights: any | null,
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
  const favorites = (answers.favorite_foods || "").toLowerCase().split(",").map((s: string) => s.trim()).filter(Boolean);

  // Get priority benefits from AI insights
  const priorityBenefits = insights ? mapInsightsToBenefits(insights) : [];

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

      // Score and sort by AI insight relevance
      if (priorityBenefits.length > 0) {
        candidates = candidates
          .map(f => ({ ...f, _score: scoreFoodForInsights(f, priorityBenefits) }))
          .sort((a, b) => b._score - a._score);
      }

      // Boost favorites
      if (favorites.length > 0) {
        candidates.sort((a, b) => {
          const aFav = favorites.some((fv: string) => a.title.toLowerCase().includes(fv) || a.desc.toLowerCase().includes(fv)) ? 1 : 0;
          const bFav = favorites.some((fv: string) => b.title.toLowerCase().includes(fv) || b.desc.toLowerCase().includes(fv)) ? 1 : 0;
          return bFav - aFav;
        });
      }

      // Pick food — rotate through top candidates by day for variety
      const topN = Math.min(candidates.length, Math.max(3, candidates.length));
      const picked = candidates[day % topN];
      const targetKcal = Math.round(kcalTarget * mealKcalSplit[mealType]);
      const ratio = targetKcal / (picked.kcal || 300);

      // Build description with insight notes
      let description = `${picked.desc}\n\n🔄 Substituições:\n• ${picked.subs.join("\n• ")}`;
      if (insights) {
        description += generateInsightNote(picked, insights);
      }

      items.push({
        meal_type: mealType,
        day_of_week: day,
        title: picked.title,
        description,
        calories_target: targetKcal,
        protein_target: Math.round(picked.p * ratio),
        carbs_target: Math.round(picked.c * ratio),
        fat_target: Math.round(picked.f * ratio),
      });
    }
  }

  return items;
}

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
  }

  if (answers.goal === "gain_muscle") {
    tips.push({ tip: "Distribua a proteína ao longo do dia, não concentre tudo em uma refeição.", category: "nutrition", icon: "💪" });
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

    // ── Fetch AI insights for this patient ──
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: aiInsights } = await serviceClient
      .from("anamnesis_ai_insights")
      .select("*")
      .eq("user_id", patient_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // ── Fetch latest physical assessment (priority over anamnesis) ──
    const { data: physicalAssessment } = await serviceClient
      .from("physical_assessments")
      .select("calories_target, protein_target, carbs_target, fat_target, tdee, bmr, weight, body_fat_percentage")
      .eq("patient_id", patient_id)
      .order("assessment_date", { ascending: false })
      .limit(1)
      .single();

    // Physical assessment targets take priority, then anamnesis, then defaults
    const kcal = physicalAssessment?.calories_target || anamnesis.computed_kcal_target || 2000;
    const protein = physicalAssessment?.protein_target || anamnesis.computed_protein || 100;
    const carbs = physicalAssessment?.carbs_target || anamnesis.computed_carbs || 250;
    const fat = physicalAssessment?.fat_target || anamnesis.computed_fat || 60;
    const answers = anamnesis.answers as Record<string, any>;
    const dataSource = physicalAssessment?.calories_target ? "physical_assessment" : "anamnesis";

    // Generate meal plan items (now with AI insights)
    const planItems = generatePlan(answers, kcal, protein, carbs, fat, aiInsights);

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
    await serviceClient.from("patient_tips").delete().eq("user_id", patient_id);
    if (tips.length > 0) {
      await serviceClient.from("patient_tips").insert(
        tips.map((t) => ({ user_id: patient_id, ...t }))
      );
    }

    // Add timeline event for AI-powered plan
    if (aiInsights) {
      await serviceClient.from("patient_timeline").insert({
        patient_id,
        event_type: "meal_plan",
        title: "Plano Alimentar Inteligente Gerado",
        description: `Plano personalizado com base nos insights da IA: ${aiInsights.primary_goal || "objetivo definido"}. Nível de atenção: ${aiInsights.risk_level || "baixo"}.`,
        metadata: {
          type: "ai_plan_generated",
          meal_plan_id,
          insight_id: aiInsights.id,
          items_count: planItems.length,
        },
        created_by: user.id,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        items_count: planItems.length,
        tips_count: tips.length,
        macros: { kcal, protein, carbs, fat },
        ai_personalized: !!aiInsights,
        insight_used: aiInsights ? {
          risk_level: aiInsights.risk_level,
          primary_goal: aiInsights.primary_goal,
          nutrition_focus: aiInsights.nutrition_focus,
        } : null,
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
