import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { validateBody } from "../_shared/validator.ts";
import { MetabolicPhaseSchema } from "../_shared/schemas.ts";

const ENGINE_VERSION = "1.0.0";

// ========== TYPES ==========

interface WeightRecord {
  weight: number;
  date: string;
}

interface PhaseClassification {
  metabolic_phase: string;
  confidence_score: number;
  clinical_reason: string;
}

interface CaloricStrategy {
  current_phase: string;
  current_calories: number;
  suggested_calories: number;
  adjustment_type: string;
  adjustment_percent: number;
  macro_adjustments: { protein_percent?: number; carbs_percent?: number; fat_percent?: number };
  expected_goal: string;
  confidence_score: number;
  narrative_explanation: string;
}

// ========== PHASE CLASSIFICATION ENGINE ==========

function classifyMetabolicPhase(
  records: WeightRecord[],
  avgAdherence: number,
  metabolicResponseType: string,
  daysSincePlanStart: number,
  currentCalories: number,
  recentAlerts: string[]
): PhaseClassification {
  if (records.length < 3) {
    return { metabolic_phase: "initial_response", confidence_score: 0.3, clinical_reason: "Dados insuficientes — fase inicial assumida." };
  }

  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const totalWeeks = Math.max(1, (new Date(sorted[sorted.length - 1].date).getTime() - new Date(sorted[0].date).getTime()) / (7 * 24 * 60 * 60 * 1000));

  // Recent trend (last 3 weeks)
  const recentRecords = sorted.slice(-6);
  const recentWeeks = recentRecords.length >= 2
    ? Math.max(0.5, (new Date(recentRecords[recentRecords.length - 1].date).getTime() - new Date(recentRecords[0].date).getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 1;
  const recentRate = recentRecords.length >= 2
    ? (recentRecords[recentRecords.length - 1].weight - recentRecords[0].weight) / recentWeeks
    : 0;

  // Overall rate
  const overallRate = (sorted[sorted.length - 1].weight - sorted[0].weight) / totalWeeks;

  // Plateau detection: weight change < 0.3kg in last 3 weeks
  const last3WeeksRecords = sorted.filter(r => {
    const d = new Date(r.date);
    const cutoff = new Date(sorted[sorted.length - 1].date);
    cutoff.setDate(cutoff.getDate() - 21);
    return d >= cutoff;
  });
  const plateauActive = last3WeeksRecords.length >= 2 &&
    Math.abs(last3WeeksRecords[last3WeeksRecords.length - 1].weight - last3WeeksRecords[0].weight) < 0.3;

  const hasStagnationAlert = recentAlerts.some(a => a.includes("stagnation") || a.includes("plateau"));
  const hasRegressionAlert = recentAlerts.some(a => a.includes("weight_gain") || a.includes("regression"));

  // Gain detection
  const isGaining = recentRate > 0.2;
  const isLosingFast = recentRate < -0.7;
  const isLosingModerate = recentRate < -0.3 && recentRate >= -0.7;
  const isLosingSlowly = recentRate < -0.1 && recentRate >= -0.3;
  const isStable = Math.abs(recentRate) <= 0.1;

  let phase = "initial_response";
  let confidence = 0.5;
  let reason = "";

  // Phase 0: Very early
  if (daysSincePlanStart <= 14 && totalWeeks < 3) {
    phase = "initial_response";
    confidence = 0.6;
    reason = "Início do acompanhamento — fase de adaptação inicial.";
  }
  // Plateau active
  else if (plateauActive && totalWeeks >= 3 && avgAdherence >= 50) {
    if (last3WeeksRecords.length >= 3) {
      phase = "plateau_active";
      confidence = 0.8;
      reason = "Estagnação instalada há mais de 3 semanas com adesão razoável.";
    } else {
      phase = "plateau_risk";
      confidence = 0.65;
      reason = "Sinais de estagnação iminente detectados.";
    }
  }
  // Slowing response
  else if (overallRate < -0.3 && isLosingSlowly && totalWeeks >= 4) {
    phase = "slowing_response";
    confidence = 0.7;
    reason = "Velocidade de perda desacelerando em relação ao histórico.";
  }
  // Active loss
  else if ((isLosingFast || isLosingModerate) && avgAdherence >= 50) {
    phase = "active_loss";
    confidence = 0.75;
    reason = "Perda ativa e consistente em curso.";
  }
  // Recovery needed (gaining after deficit period)
  else if (isGaining && totalWeeks >= 8 && overallRate < 0 && metabolicResponseType === "resistant_metabolism") {
    phase = "recovery";
    confidence = 0.6;
    reason = "Metabolismo resistente com sinais de fadiga metabólica. Recuperação sugerida.";
  }
  // Consolidation (stable after significant loss)
  else if (isStable && overallRate < -2 && totalWeeks >= 8) {
    phase = "consolidation";
    confidence = 0.7;
    reason = "Peso estabilizado após perda significativa. Fase de consolidação.";
  }
  // Maintenance (stable, near goal, long duration)
  else if (isStable && totalWeeks >= 12 && avgAdherence >= 60) {
    phase = "maintenance";
    confidence = 0.65;
    reason = "Peso estável por período prolongado. Fase de manutenção.";
  }
  // Recomposition (stable weight, high protein adherence hint)
  else if (isStable && avgAdherence >= 70 && totalWeeks >= 6 && Math.abs(overallRate) < 0.15) {
    phase = "recomposition";
    confidence = 0.55;
    reason = "Peso estável com alta adesão — possível fase de recomposição corporal.";
  }
  // Plateau risk from alerts
  else if (hasStagnationAlert && !plateauActive) {
    phase = "plateau_risk";
    confidence = 0.6;
    reason = "Alertas de estagnação detectados pelo motor clínico.";
  }
  // Fallback: initial
  else {
    phase = "initial_response";
    confidence = 0.4;
    reason = "Padrão misto — mantendo classificação de fase inicial.";
  }

  // Adjust confidence based on data quality
  if (records.length >= 10) confidence = Math.min(0.95, confidence + 0.05);
  if (totalWeeks >= 8) confidence = Math.min(0.95, confidence + 0.05);
  if (avgAdherence < 30) confidence = Math.max(0.2, confidence - 0.15);

  return {
    metabolic_phase: phase,
    confidence_score: Math.round(confidence * 100) / 100,
    clinical_reason: reason,
  };
}

// ========== CALORIC STRATEGY ENGINE ==========

function generateCaloricStrategy(
  phase: string,
  currentCalories: number,
  strategyRule: any,
  metabolicResponseType: string,
  avgAdherence: number,
  confidence: number,
  params: Record<string, number>
): CaloricStrategy {
  const minAdherence = params["min_adherence_for_auto_adjust"] ?? 40;
  const maxDeficit = params["max_deficit_adjustment_percent"] ?? 12;
  const minConfidence = params["min_confidence_for_automation"] ?? 0.6;

  const range = strategyRule?.caloric_adjustment_range ?? { min_percent: -5, max_percent: 5 };
  let adjustmentPercent = 0;
  let adjustmentType = strategyRule?.default_adjustment_type ?? "keep_current";
  let expectedGoal = "";
  let macroAdj: any = {};

  // Safety: block if low adherence or low confidence
  if (avgAdherence < minAdherence && adjustmentType !== "keep_current") {
    adjustmentType = "require_manual_review";
    expectedGoal = "Adesão insuficiente para ajuste automático. Revisão manual necessária.";
  } else if (confidence < minConfidence && adjustmentType !== "keep_current") {
    adjustmentType = "maintain_and_monitor";
    expectedGoal = "Confiança insuficiente. Monitorar antes de ajustar.";
  } else {
    switch (phase) {
      case "initial_response":
        adjustmentPercent = 0;
        expectedGoal = "Manter protocolo e avaliar resposta inicial.";
        break;
      case "active_loss":
        adjustmentPercent = metabolicResponseType === "rapid_responder" ? -2 : 0;
        expectedGoal = "Manter ritmo de perda ativa.";
        break;
      case "slowing_response":
        adjustmentPercent = -5;
        macroAdj = { protein_percent: 30, carbs_percent: 40, fat_percent: 30 };
        expectedGoal = "Reativar resposta com ajuste leve e aumento proteico.";
        break;
      case "plateau_risk":
        adjustmentPercent = -7;
        macroAdj = { protein_percent: 32, carbs_percent: 38, fat_percent: 30 };
        expectedGoal = "Prevenir estagnação com intervenção calórica moderada.";
        break;
      case "plateau_active":
        adjustmentType = "start_diet_break";
        adjustmentPercent = 8; // increase for diet break
        macroAdj = { protein_percent: 28, carbs_percent: 45, fat_percent: 27 };
        expectedGoal = "Desbloqueio metabólico via diet break estratégico.";
        break;
      case "consolidation":
        adjustmentPercent = 5;
        expectedGoal = "Aumento gradual para consolidar peso conquistado.";
        break;
      case "recovery":
        adjustmentPercent = 10;
        expectedGoal = "Recuperação metabólica com aumento calórico progressivo.";
        break;
      case "maintenance":
        adjustmentPercent = 0;
        expectedGoal = "Manutenção calórica estável.";
        break;
      case "recomposition":
        adjustmentPercent = -3;
        macroAdj = { protein_percent: 35, carbs_percent: 35, fat_percent: 30 };
        expectedGoal = "Recomposição corporal com alta proteína e leve déficit.";
        break;
    }
  }

  // Clamp to range and max deficit
  adjustmentPercent = Math.max(range.min_percent ?? -maxDeficit, Math.min(range.max_percent ?? maxDeficit, adjustmentPercent));
  if (adjustmentPercent < 0) adjustmentPercent = Math.max(-maxDeficit, adjustmentPercent);

  const suggestedCalories = Math.round(currentCalories * (1 + adjustmentPercent / 100));

  // Caloric floor safety
  const floor = params["max_caloric_floor_female"] ?? 1200;
  const safeSuggested = Math.max(floor, suggestedCalories);

  // Narrative
  const narrativeMap: Record<string, string> = {
    initial_response: "Seu corpo está respondendo bem ao protocolo. Vamos manter a estratégia atual e acompanhar sua evolução.",
    active_loss: "Excelente progresso! A perda está ativa e consistente. Mantendo o ritmo atual com acompanhamento contínuo.",
    slowing_response: "Sua curva mostra desaceleração. A próxima fase vai priorizar um ajuste fino para evitar platô.",
    plateau_risk: "Sinais de estagnação estão aparecendo. Estamos preparando uma intervenção preventiva para manter seu progresso.",
    plateau_active: "Seu metabolismo precisa de um reset. A estratégia agora é uma pausa metabólica controlada para reativar a resposta.",
    consolidation: "Você atingiu um ponto de consolidação! Agora vamos proteger o resultado conquistado com aumento gradual.",
    recovery: "Fase de recuperação ativada. Seu corpo precisa restaurar o metabolismo antes do próximo ciclo.",
    maintenance: "Parabéns pela estabilidade! O foco agora é manter seus resultados com constância.",
    recomposition: "Fase de recomposição corporal. Alta proteína e ajustes estratégicos para transformar composição.",
  };

  return {
    current_phase: phase,
    current_calories: currentCalories,
    suggested_calories: safeSuggested,
    adjustment_type: adjustmentType,
    adjustment_percent: adjustmentPercent,
    macro_adjustments: macroAdj,
    expected_goal: expectedGoal,
    confidence_score: confidence,
    narrative_explanation: narrativeMap[phase] || "Monitorando sua evolução para determinar a melhor estratégia.",
  };
}

// ========== MAIN ==========

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: body, response: errorResponse } = await validateBody(req, MetabolicPhaseSchema);
    if (errorResponse) return errorResponse;

    const patient_id = body.patient_id;
    const trigger_source = "automatic";
    const targetPatient = patient_id || user.id;

    // === GATHER DATA IN PARALLEL ===
    const [historyRes, checkinsRes, profileRes, planRes, alertsRes, rulesRes, paramsRes] = await Promise.all([
      supabase.from("patient_weight_history").select("weight_kg, recorded_at").eq("patient_id", targetPatient).order("recorded_at", { ascending: true }),
      supabase.from("weight_checkins").select("weight, checked_at, adherence_score").eq("patient_id", targetPatient).order("checked_at", { ascending: true }),
      supabase.from("profiles").select("metabolic_response_type, metabolic_phase, metabolic_phase_last_updated_at").eq("user_id", targetPatient).single(),
      supabase.from("meal_plans").select("id, total_calories, created_at").eq("patient_id", targetPatient).eq("is_active", true).order("created_at", { ascending: false }).limit(1),
      supabase.from("clinical_alerts").select("alert_type").eq("patient_id", targetPatient).eq("is_active", true),
      supabase.from("metabolic_phase_strategy_rules").select("*").eq("is_active", true),
      supabase.from("clinical_system_parameters").select("parameter_key, parameter_value"),
    ]);

    // Build weight records
    const weightRecords: WeightRecord[] = [];
    const seenDates = new Set<string>();
    for (const h of (historyRes.data || [])) {
      const d = h.recorded_at?.split("T")[0];
      if (d && !seenDates.has(d)) { seenDates.add(d); weightRecords.push({ weight: h.weight_kg, date: d }); }
    }
    for (const c of (checkinsRes.data || [])) {
      const d = c.checked_at?.split("T")[0];
      if (d && !seenDates.has(d)) { seenDates.add(d); weightRecords.push({ weight: c.weight, date: d }); }
    }

    const adherenceScores = (checkinsRes.data || []).filter(c => c.adherence_score != null).map(c => c.adherence_score!);
    const avgAdherence = adherenceScores.length > 0 ? adherenceScores.reduce((a, b) => a + b, 0) / adherenceScores.length : 50;

    const activePlan = (planRes.data || [])[0];
    const currentCalories = activePlan?.total_calories || 1800;
    const daysSincePlanStart = activePlan?.created_at
      ? Math.floor((Date.now() - new Date(activePlan.created_at).getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    const recentAlerts = (alertsRes.data || []).map((a: any) => a.alert_type);
    const metabolicResponseType = profileRes.data?.metabolic_response_type || "unknown";
    const previousPhase = profileRes.data?.metabolic_phase || "initial_response";

    // System parameters as map
    const params: Record<string, number> = {};
    for (const p of (paramsRes.data || [])) {
      params[p.parameter_key] = p.parameter_value;
    }

    // Strategy rules as map
    const rulesMap: Record<string, any> = {};
    for (const r of (rulesRes.data || [])) {
      rulesMap[r.phase_type] = r;
    }

    // === CLASSIFY PHASE ===
    const phaseResult = classifyMetabolicPhase(
      weightRecords, avgAdherence, metabolicResponseType, daysSincePlanStart, currentCalories, recentAlerts
    );

    // === GENERATE STRATEGY ===
    const strategyRule = rulesMap[phaseResult.metabolic_phase];
    const strategy = generateCaloricStrategy(
      phaseResult.metabolic_phase, currentCalories, strategyRule,
      metabolicResponseType, avgAdherence, phaseResult.confidence_score, params
    );

    // === PERSIST ===
    const phaseChanged = previousPhase !== phaseResult.metabolic_phase;

    await supabase.from("profiles").update({
      metabolic_phase: phaseResult.metabolic_phase,
      metabolic_phase_last_updated_at: new Date().toISOString(),
    }).eq("user_id", targetPatient);

    await supabase.from("metabolic_phase_history").insert({
      patient_id: targetPatient,
      phase_type: phaseResult.metabolic_phase,
      previous_phase: previousPhase,
      strategy_type: strategy.adjustment_type,
      calories_before: currentCalories,
      calories_after: strategy.suggested_calories,
      macro_adjustments: strategy.macro_adjustments,
      confidence_score: phaseResult.confidence_score,
      clinical_reason: phaseResult.clinical_reason,
      trigger_source,
      engine_version: ENGINE_VERSION,
      created_by: user.id,
    });

    return new Response(JSON.stringify({
      phase: phaseResult,
      strategy,
      previous_phase: previousPhase,
      phase_changed: phaseChanged,
      data_points: weightRecords.length,
      engine_version: ENGINE_VERSION,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("compute-metabolic-phase-strategy error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
