import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Deterministic Formulas ────────────────────────────────────────────────────

/** Mifflin-St Jeor BMR */
function calcBMR(weight: number, height: number, age: number, sex: "M" | "F"): number {
  if (sex === "M") return 10 * weight + 6.25 * height - 5 * age + 5;
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  sedentario: 1.2, leve: 1.375, moderado: 1.55, ativo: 1.725, muito_ativo: 1.9,
};

function calcTDEE(bmr: number, activity: string): number {
  return bmr * (ACTIVITY_MULTIPLIERS[activity?.toLowerCase()] ?? 1.375);
}

function calcKcalTarget(tdee: number, goal: string): number {
  const g = goal?.toLowerCase() ?? "";
  if (g.includes("emagrec") || g.includes("perda") || g.includes("perd") || g.includes("cut")) return Math.round(tdee * 0.85);
  if (g.includes("hipertrofia") || g.includes("ganhar") || g.includes("massa") || g.includes("bulk")) return Math.round(tdee * 1.1);
  return Math.round(tdee);
}

function calcMacros(kcal: number, goal: string): { protein: number; carbs: number; fat: number } {
  const g = goal?.toLowerCase() ?? "";
  let pPct = 0.30, cPct = 0.40, fPct = 0.30;
  if (g.includes("hipertrofia") || g.includes("massa")) { pPct = 0.35; cPct = 0.45; fPct = 0.20; }
  if (g.includes("emagrec") || g.includes("perda")) { pPct = 0.35; cPct = 0.35; fPct = 0.30; }
  return { protein: Math.round((kcal * pPct) / 4), carbs: Math.round((kcal * cPct) / 4), fat: Math.round((kcal * fPct) / 9) };
}

function computeBMI(answers: Record<string, any>): number {
  const w = parseFloat(answers.weight); const h = parseFloat(answers.height) / 100;
  if (!w || !h) return 0; return w / (h * h);
}

function calcRiskLevel(answers: Record<string, any>): "low" | "medium" | "high" {
  let score = 0;
  if (answers.smoking === true || answers.smoking === "yes") score += 2;
  if (answers.diabetes === true || answers.diabetes === "yes") score += 2;
  if (answers.hypertension === true || answers.hypertension === "yes") score += 2;
  if (answers.medications && String(answers.medications).length > 10) score += 1;
  if (answers.clinical_history && String(answers.clinical_history).length > 20) score += 1;
  const bmi = computeBMI(answers);
  if (bmi > 35) score += 2; else if (bmi > 30) score += 1;
  if (score >= 4) return "high"; if (score >= 2) return "medium"; return "low";
}

function buildInsights(answers: Record<string, any>, macros: { protein: number; carbs: number; fat: number }, kcal: number) {
  const tips: Array<{ tip: string; category: string; icon: string }> = [];
  const nutrition_focus: string[] = [], behavior_focus: string[] = [], movement_focus: string[] = [], main_pains: string[] = [];
  const water = parseFloat(answers.water_intake ?? "0");
  if (water < 6) { tips.push({ tip: `Aumente a ingesta hídrica para ao menos 35ml/kg de peso corporal.`, category: "hydration", icon: "💧" }); main_pains.push("Hidratação insuficiente"); }
  if (answers.sleep_quality === "bad" || answers.sleep_quality === "ruim") { tips.push({ tip: "Priorize 7-9h de sono por noite. O sono regula os hormônios de saciedade (leptina/grelina).", category: "sleep", icon: "😴" }); behavior_focus.push("Higiene do sono: rotina antes de dormir"); main_pains.push("Qualidade do sono prejudicada"); }
  const goal = answers.goal?.toLowerCase() ?? "";
  if (goal.includes("emagrec") || goal.includes("perda")) {
    nutrition_focus.push(`Meta calórica: ${kcal} kcal (déficit de 15% sobre TDEE)`);
    nutrition_focus.push(`Proteína elevada: ${macros.protein}g/dia para preservar massa magra`);
    movement_focus.push("Treino de força 3x/semana + caminhada diária");
    tips.push({ tip: `Priorize proteínas em todas as refeições (meta: ${macros.protein}g/dia).`, category: "nutrition", icon: "🥩" });
  } else if (goal.includes("hipertrofia") || goal.includes("massa")) {
    nutrition_focus.push(`Meta calórica: ${kcal} kcal (superávit de 10% sobre TDEE)`);
    nutrition_focus.push(`Distribuir ${macros.carbs}g de carboidratos ao longo do dia`);
    movement_focus.push("Treino de força progressivo 4-5x/semana");
    tips.push({ tip: "Distribua as refeições a cada 3-4 horas para maximizar a síntese proteica.", category: "nutrition", icon: "💪" });
  } else {
    nutrition_focus.push(`Meta de manutenção: ${kcal} kcal/dia`);
    nutrition_focus.push("Variedade alimentar com foco em alimentos minimamente processados");
    movement_focus.push("150 min/semana de atividade moderada (recomendação OMS)");
  }
  if (answers.digestion === "bad" || answers.digestion === "ruim") { nutrition_focus.push("Aumentar fibras (frutas, legumes, cereais integrais)"); tips.push({ tip: "Alimentos fermentados (iogurte, kefir) auxiliam a microbiota intestinal.", category: "nutrition", icon: "🫙" }); main_pains.push("Digestão comprometida"); }
  if (answers.hunger_compulsion === "yes" || answers.hunger_compulsion === "alta") { behavior_focus.push("Comer devagar e sem telas para aumentar saciedade"); behavior_focus.push("Distribuir refeições para manter glicemia estável"); main_pains.push("Compulsão alimentar / fome excessiva"); tips.push({ tip: "Inclua proteína + fibra em cada refeição para prolongar a saciedade.", category: "nutrition", icon: "🥗" }); }
  tips.push({ tip: `Distribua ${macros.protein}g de proteína em ${answers.meals_per_day ?? 4} refeições diárias.`, category: "nutrition", icon: "🍳" });
  tips.push({ tip: "Registre alimentação diária para identificar padrões e aumentar consciência.", category: "planning", icon: "📋" });
  return { tips, nutrition_focus, behavior_focus, movement_focus, main_pains };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader || "" } } });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { anamnesis_id } = await req.json();
    if (!anamnesis_id) return new Response(JSON.stringify({ error: "anamnesis_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Resolve tenant
    const { data: callerTenantData } = await serviceClient.from("user_tenants").select("tenant_id").eq("user_id", user.id).limit(1).maybeSingle();
    const tenantId = callerTenantData?.tenant_id || null;

    const { data: anamnesis, error: fetchErr } = await serviceClient.from("patient_anamnesis").select("*").eq("id", anamnesis_id).single();
    if (fetchErr || !anamnesis) return new Response(JSON.stringify({ error: "Anamnese não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const answers = anamnesis.answers as Record<string, any>;
    let weight = parseFloat(answers.weight ?? "70"); let height = parseFloat(answers.height ?? "170"); const age = parseInt(answers.age ?? "30");
    // Normalize: height in meters → cm, weight in grams → kg
    if (height > 0 && height < 3) height = height * 100;
    if (weight > 300) weight = weight / 1000;
    const sex: "M" | "F" = (answers.sex?.toLowerCase() === "feminino" || answers.sex === "F" || answers.sex === "female") ? "F" : "M";
    const bmr = calcBMR(weight, height, age, sex);
    const tdee = calcTDEE(bmr, answers.activity_level ?? "moderate");
    const kcal = calcKcalTarget(tdee, answers.goal ?? "");
    const macros = calcMacros(kcal, answers.goal ?? "");
    const risk = calcRiskLevel(answers);
    const { tips: personalized_tips, nutrition_focus, behavior_focus, movement_focus, main_pains } = buildInsights(answers, macros, kcal);
    const goal = answers.goal ?? "manutenção";
    const protocolMap: Record<string, string> = { emagrec: "Protocolo Emagrecimento Gradual 12 semanas", perda: "Protocolo Emagrecimento Gradual 12 semanas", hipertrofia: "Protocolo Hipertrofia Lean 16 semanas", massa: "Protocolo Hipertrofia Lean 16 semanas" };
    const suggested_protocol = Object.entries(protocolMap).find(([k]) => goal.toLowerCase().includes(k))?.[1] ?? "Protocolo Equilíbrio e Saúde 8 semanas";
    const insights = { risk_level: risk, primary_goal: `${goal} — ${kcal} kcal/dia`, metabolic_profile: `TMB: ${Math.round(bmr)} kcal | TDEE: ${Math.round(tdee)} kcal | IMC: ${computeBMI(answers).toFixed(1)}`, main_pains, nutrition_focus, behavior_focus, movement_focus, suggested_protocol, personalized_tips, ai_summary: `Motor Clínico calculou TMB de ${Math.round(bmr)} kcal e TDEE de ${Math.round(tdee)} kcal com nível de atividade ${answers.activity_level ?? "moderado"}. Meta calórica definida em ${kcal} kcal/dia para o objetivo: "${goal}". Distribuição de macros: P ${macros.protein}g | C ${macros.carbs}g | G ${macros.fat}g.` };
    const auditMetadata = { engine: "analyze-anamnesis@deterministic_v2", run_at: new Date().toISOString(), formula_bmr: sex === "M" ? `10 * ${weight} + 6.25 * ${height} - 5 * ${age} + 5 = ${Math.round(bmr)}` : `10 * ${weight} + 6.25 * ${height} - 5 * ${age} - 161 = ${Math.round(bmr)}`, formula_tdee: `BMR(${Math.round(bmr)}) × ${ACTIVITY_MULTIPLIERS[answers.activity_level?.toLowerCase()] ?? 1.375} (${answers.activity_level ?? "moderate"}) = ${Math.round(tdee)}`, goal_adjustment: answers.goal?.toLowerCase().includes("emagrec") || answers.goal?.toLowerCase().includes("perda") ? `TDEE × 0.85 (déficit 15%) = ${kcal}` : answers.goal?.toLowerCase().includes("hipertrofia") || answers.goal?.toLowerCase().includes("massa") ? `TDEE × 1.10 (superávit 10%) = ${kcal}` : `TDEE = ${kcal} (manutenção)`, macro_distribution: { protein_pct: answers.goal?.toLowerCase().includes("hipertrofia") ? "35%" : answers.goal?.toLowerCase().includes("emagrec") ? "35%" : "30%", carbs_pct: answers.goal?.toLowerCase().includes("hipertrofia") ? "45%" : answers.goal?.toLowerCase().includes("emagrec") ? "35%" : "40%", fat_pct: answers.goal?.toLowerCase().includes("hipertrofia") ? "20%" : "30%" }, inputs: { weight, height, age, sex, activity_level: answers.activity_level, goal: answers.goal }, outputs: { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, ...macros }, risk_score_factors: { smoking: answers.smoking ? 2 : 0, diabetes: answers.diabetes ? 2 : 0, hypertension: answers.hypertension ? 2 : 0, medications: answers.medications?.length > 10 ? 1 : 0, bmi: computeBMI(answers) > 35 ? 2 : computeBMI(answers) > 30 ? 1 : 0 } };
    await serviceClient.from("patient_anamnesis").update({ computed_tmb: Math.round(bmr), computed_tdee: Math.round(tdee), computed_kcal_target: kcal, computed_protein: macros.protein, computed_carbs: macros.carbs, computed_fat: macros.fat, audit_metadata: auditMetadata }).eq("id", anamnesis_id);
    const { data: insightRow, error: insightErr } = await serviceClient.from("anamnesis_ai_insights").insert({ user_id: anamnesis.user_id, anamnesis_id, risk_level: insights.risk_level, primary_goal: insights.primary_goal, metabolic_profile: insights.metabolic_profile, main_pains: insights.main_pains, nutrition_focus: insights.nutrition_focus, behavior_focus: insights.behavior_focus, movement_focus: insights.movement_focus, suggested_protocol: insights.suggested_protocol, personalized_tips: insights.personalized_tips, ai_summary: insights.ai_summary, raw_response: auditMetadata, tenant_id: tenantId }).select().single();
    if (insightErr) throw insightErr;
    const recommendations = [{ category: "nutrition", title: `Meta calórica: ${kcal} kcal`, description: insights.ai_summary, priority: "high", icon: "🎯" }, { category: "nutrition", title: `Proteína: ${macros.protein}g/dia`, description: "Distribuídas em todas as refeições.", priority: "high", icon: "🥩" }, ...nutrition_focus.slice(0, 3).map((nf, i) => ({ category: "nutrition", title: nf, description: "", priority: i === 0 ? "high" : "medium" as any, icon: "🥗" })), ...behavior_focus.slice(0, 2).map(bf => ({ category: "behavior", title: bf, description: "", priority: "medium" as any, icon: "🧠" }))];
    const recsWithIds = recommendations.map(rec => ({ user_id: anamnesis.user_id, insight_id: insightRow.id, ...rec }));
    if (recsWithIds.length > 0) await serviceClient.from("patient_recommendations").insert(recsWithIds);
    const tipsToInsert = insights.personalized_tips.map(t => ({ user_id: anamnesis.user_id, tip: t.tip, category: t.category, icon: t.icon }));
    await serviceClient.from("patient_tips").delete().eq("user_id", anamnesis.user_id);
    if (tipsToInsert.length > 0) await serviceClient.from("patient_tips").insert(tipsToInsert);
    await serviceClient.from("patient_timeline").insert([{ patient_id: anamnesis.user_id, event_type: "achievement", title: "Motor Clínico processou Anamnese", description: `Nível de atenção: ${risk === "high" ? "Alto" : risk === "medium" ? "Médio" : "Baixo"} | Meta: ${kcal} kcal/dia`, metadata: { type: "anamnesis_completed", risk_level: risk, engine: "deterministic_v1" }, created_by: anamnesis.user_id }, { patient_id: anamnesis.user_id, event_type: "protocol", title: "Protocolo Sugerido (Motor Clínico)", description: insights.suggested_protocol, metadata: { type: "suggested_protocol_created" }, created_by: anamnesis.user_id }]);

    // Notify Nutritionist in Real-time
    try {
      const { data: linkData } = await serviceClient
        .from("nutritionist_patients")
        .select("nutritionist_id")
        .eq("patient_id", anamnesis.user_id)
        .maybeSingle();

      if (linkData?.nutritionist_id) {
        const { data: profile } = await serviceClient
          .from("profiles")
          .select("full_name")
          .eq("user_id", anamnesis.user_id)
          .maybeSingle();

        await serviceClient.from("notifications").insert({
          user_id: linkData.nutritionist_id,
          title: "✅ Anamnese Concluída",
          message: `${profile?.full_name || "Um paciente"} acabou de completar a anamnese.`,
          type: "success",
          entity_type: "patient",
          entity_id: anamnesis.user_id,
          target_route: `/patients/${anamnesis.user_id}`,
        } as any);
      }
    } catch (err) {
      console.warn("Failed to notify nutritionist:", err);
    }
    return new Response(JSON.stringify({ success: true, insight_id: insightRow.id, risk_level: insights.risk_level, tips_count: tipsToInsert.length, recommendations_count: recsWithIds.length, summary: insights.ai_summary, computed: { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, ...macros } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("analyze-anamnesis (deterministic) error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
