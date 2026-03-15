import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";

// ── Response Classification ─────────────────────────────────
type ResponseClass = "fast_responder" | "adaptive_responder" | "plateau_prone" | "resistant_metabolism" | "recomposition_pattern";

function classifyResponse(efficiency: number, resistance: number, fatLoss: number, leanPres: number): ResponseClass {
  if (efficiency > 70 && resistance < 30) return "fast_responder";
  if (leanPres > 70 && fatLoss > 50) return "recomposition_pattern";
  if (resistance > 70) return "resistant_metabolism";
  if (resistance > 50 && efficiency < 40) return "plateau_prone";
  return "adaptive_responder";
}

// ── Build Twin Model ────────────────────────────────────────
function buildTwinModel(weightHistory: any[], dynamics: any, adherenceAvg: number, clusterType: string) {
  const hasData = weightHistory.length >= 3;
  const baseConfidence = hasData ? Math.min(95, 30 + weightHistory.length * 5) : 15;

  // Metabolic efficiency: how well deficit converts to weight loss
  const avgWeeklyChange = dynamics?.avg_weekly_weight_change ?? 0;
  const metabolicEfficiency = Math.max(10, Math.min(95,
    50 + (Math.abs(avgWeeklyChange) > 0.5 ? 20 : avgWeeklyChange < 0 ? 10 : -10)
    + (adherenceAvg > 70 ? 10 : -5)
    + (clusterType === "metabolic_responder" ? 15 : clusterType === "resistant_profile" ? -15 : 0)
  ));

  // Adaptive resistance: tendency to stall
  const volatility = dynamics?.volatility_score ?? 50;
  const plateaus = dynamics?.detected_plateaus ?? 0;
  const adaptiveResistance = Math.max(5, Math.min(95,
    30 + plateaus * 10 + (volatility < 20 ? 15 : -5)
    + (clusterType === "resistant_profile" ? 20 : clusterType === "metabolic_responder" ? -15 : 0)
  ));

  // Fat loss response index
  const fatLossResponse = Math.max(10, Math.min(95,
    metabolicEfficiency * 0.6 + (100 - adaptiveResistance) * 0.4
  ));

  // Lean mass preservation (higher adherence + lower deficit = better)
  const leanMassPreservation = Math.max(15, Math.min(95,
    40 + (adherenceAvg > 80 ? 25 : adherenceAvg > 60 ? 10 : -5)
    + (Math.abs(avgWeeklyChange) < 0.8 ? 15 : -10)
    + (clusterType === "recomposition_pattern" ? 15 : 0)
  ));

  // Metabolic flexibility
  const metabolicFlexibility = Math.max(10, Math.min(95,
    (metabolicEfficiency * 0.3) + ((100 - adaptiveResistance) * 0.3) + (adherenceAvg * 0.4)
  ));

  // Predicted plateau weeks
  const predictedPlateauWeeks = Math.max(2, Math.min(24,
    Math.round(8 - plateaus * 1.5 + (metabolicEfficiency / 20) - (adaptiveResistance / 25))
  ));

  // Regain risk
  const regainRisk = Math.max(5, Math.min(95,
    20 + (volatility > 60 ? 25 : 0) + (adaptiveResistance > 60 ? 20 : 0) + (adherenceAvg < 50 ? 20 : -10)
  ));

  const classification = classifyResponse(metabolicEfficiency, adaptiveResistance, fatLossResponse, leanMassPreservation);

  return {
    metabolic_efficiency_score: Math.round(metabolicEfficiency * 10) / 10,
    adaptive_resistance_score: Math.round(adaptiveResistance * 10) / 10,
    fat_loss_response_index: Math.round(fatLossResponse * 10) / 10,
    lean_mass_preservation_index: Math.round(leanMassPreservation * 10) / 10,
    metabolic_flexibility_index: Math.round(metabolicFlexibility * 10) / 10,
    predicted_plateau_weeks: predictedPlateauWeeks,
    regain_risk_score: Math.round(regainRisk * 10) / 10,
    response_classification: classification,
    model_confidence: Math.round(baseConfidence * 10) / 10,
  };
}

// ── Simulate Intervention ───────────────────────────────────
function simulateIntervention(
  twin: any,
  interventionType: string,
  currentWeight: number
) {
  const efficiency = twin.metabolic_efficiency_score ?? 50;
  const resistance = twin.adaptive_resistance_score ?? 50;
  const regainRisk = twin.regain_risk_score ?? 30;

  const interventions: Record<string, { deficit: number; stressFactor: number; label: string }> = {
    moderate_deficit: { deficit: -0.5, stressFactor: 0.3, label: "Déficit Moderado (-500kcal)" },
    aggressive_deficit: { deficit: -1.0, stressFactor: 0.7, label: "Déficit Agressivo (-1000kcal)" },
    diet_break: { deficit: 0, stressFactor: -0.5, label: "Diet Break (manutenção)" },
    reverse_diet: { deficit: 0.2, stressFactor: -0.3, label: "Reverse Diet (+200kcal)" },
    maintenance_phase: { deficit: 0, stressFactor: -0.2, label: "Fase de Manutenção" },
    hypertrophy_phase: { deficit: 0.3, stressFactor: 0.1, label: "Fase Hipertrófica (+300kcal)" },
  };

  const config = interventions[interventionType] || interventions.moderate_deficit;

  // Weight delta (4 weeks)
  const weeklyLoss = config.deficit * (efficiency / 100);
  const resistanceDrag = 1 - (resistance / 200); // 50% resistance = 0.75 multiplier
  const expectedWeightDelta4w = Math.round(weeklyLoss * 4 * resistanceDrag * 10) / 10;

  // Body fat delta estimate
  const expectedBodyFatDelta = Math.round((expectedWeightDelta4w / currentWeight) * 100 * 0.7 * 10) / 10;

  // Plateau probability
  const plateauProb = Math.max(5, Math.min(90,
    resistance * 0.5 + config.stressFactor * 30 + (Math.abs(config.deficit) > 0.7 ? 15 : 0)
  ));

  // Adherence risk
  const adherenceRisk = Math.max(5, Math.min(90,
    20 + config.stressFactor * 40 + (Math.abs(config.deficit) > 0.7 ? 20 : -10)
  ));

  // Metabolic stress score
  const metabolicStress = Math.max(5, Math.min(95,
    config.stressFactor * 50 + resistance * 0.3 + (regainRisk > 60 ? 10 : 0)
  ));

  // Block extreme simulations
  const blocked = Math.abs(config.deficit) > 1.2;

  return {
    intervention_type: interventionType,
    label: config.label,
    expected_weight_delta_4w: blocked ? 0 : expectedWeightDelta4w,
    expected_body_fat_delta: blocked ? 0 : expectedBodyFatDelta,
    plateau_probability: Math.round(plateauProb),
    adherence_risk: Math.round(adherenceRisk),
    metabolic_stress_score: Math.round(metabolicStress),
    blocked,
    block_reason: blocked ? "Déficit extremo bloqueado por segurança clínica" : null,
  };
}

// ── Plateau Prediction ──────────────────────────────────────
function predictPlateau(twin: any) {
  const weeks = twin.predicted_plateau_weeks ?? 8;
  const resistance = twin.adaptive_resistance_score ?? 50;

  const intensity = resistance > 70 ? "severe" : resistance > 45 ? "moderate" : "mild";

  const recommendations: Record<string, string> = {
    severe: "Considerar diet break preventivo ou refeed estruturado antes da semana " + Math.max(1, weeks - 2),
    moderate: "Monitorar adesão e ajustar calorias de forma conservadora na semana " + weeks,
    mild: "Manter protocolo atual com reavaliação na semana " + (weeks + 2),
  };

  return {
    predicted_plateau_start_week: weeks,
    predicted_plateau_intensity: intensity,
    preventive_recommendation: recommendations[intensity],
    prediction_confidence: twin.model_confidence ?? 30,
  };
}

// ── Strategy Recommendation ─────────────────────────────────
function recommendStrategy(twin: any) {
  const classification = twin.response_classification;
  const regainRisk = twin.regain_risk_score ?? 30;
  const resistance = twin.adaptive_resistance_score ?? 50;
  const plateauWeeks = twin.predicted_plateau_weeks ?? 8;

  type Strategy = { strategy: string; urgency: string; benefit: number; reason: string };
  const strategies: Strategy[] = [];

  if (plateauWeeks <= 3) {
    strategies.push({
      strategy: "diet_break_preventivo",
      urgency: "alta",
      benefit: 75,
      reason: "Platô iminente detectado — diet break pode preservar metabolismo"
    });
  }

  if (resistance > 65) {
    strategies.push({
      strategy: "reducao_deficit",
      urgency: "media",
      benefit: 60,
      reason: "Alta resistência adaptativa — déficit menor pode ser mais eficaz"
    });
  }

  if (regainRisk > 60) {
    strategies.push({
      strategy: "fase_consolidacao",
      urgency: "alta",
      benefit: 80,
      reason: "Risco de reganho elevado — consolidação previne efeito sanfona"
    });
  }

  if (classification === "recomposition_pattern") {
    strategies.push({
      strategy: "foco_hipertrofia",
      urgency: "baixa",
      benefit: 65,
      reason: "Padrão de recomposição detectado — fase hipertrófica pode acelerar resultados"
    });
  }

  if (strategies.length === 0) {
    strategies.push({
      strategy: "manter_protocolo",
      urgency: "baixa",
      benefit: 50,
      reason: "Modelo metabólico estável — manter protocolo atual"
    });
  }

  return strategies.sort((a, b) => b.benefit - a.benefit);
}

// ── Main Handler ────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { patient_id, simulate_intervention } = await req.json();
    if (!patient_id) throw new Error("patient_id required");

    // 1. Load weight history
    const { data: weightHistory } = await supabase
      .from("patient_weight_history")
      .select("*")
      .eq("patient_id", patient_id)
      .order("measurement_date", { ascending: true });

    // 2. Load dynamics
    const { data: dynamicsArr } = await supabase
      .from("patient_weight_dynamics")
      .select("*")
      .eq("patient_id", patient_id)
      .limit(1);
    const dynamics = dynamicsArr?.[0] ?? null;

    // 3. Load cluster
    const { data: clusterArr } = await supabase
      .from("patient_metabolic_clusters")
      .select("cluster_type")
      .eq("patient_id", patient_id)
      .limit(1);
    const clusterType = clusterArr?.[0]?.cluster_type ?? "unknown";

    // 4. Load adherence avg
    const { data: snapshots } = await supabase
      .from("patient_clinical_snapshots")
      .select("adherence_momentum")
      .eq("patient_id", patient_id)
      .order("snapshot_date", { ascending: false })
      .limit(5);
    const adherenceAvg = snapshots?.length
      ? snapshots.reduce((s: number, r: any) => s + (r.adherence_momentum ?? 50), 0) / snapshots.length
      : 50;

    // 5. Build twin model
    const twin = buildTwinModel(weightHistory ?? [], dynamics, adherenceAvg, clusterType);

    // 6. Persist twin
    await supabase.from("patient_metabolic_twin").upsert({
      patient_id,
      ...twin,
      twin_model_version: ENGINE_VERSION,
      model_inputs: {
        weight_points: (weightHistory ?? []).length,
        cluster_type: clusterType,
        adherence_avg: Math.round(adherenceAvg),
        dynamics_available: !!dynamics,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "patient_id" });

    // 7. Plateau prediction
    const plateau = predictPlateau(twin);
    await supabase.from("patient_plateau_predictions").insert({
      patient_id,
      ...plateau,
      prediction_model_version: ENGINE_VERSION,
    });

    // 8. If simulation requested
    let simulation = null;
    if (simulate_intervention) {
      const currentWeight = (weightHistory ?? []).length > 0
        ? weightHistory![weightHistory!.length - 1].weight
        : 70;
      simulation = simulateIntervention(twin, simulate_intervention, currentWeight);
    }

    // 9. Strategy recommendations
    const strategies = recommendStrategy(twin);

    // 10. Timeline entry
    await supabase.from("patient_timeline").insert({
      patient_id,
      event_type: "metabolic_twin_updated",
      title: "Digital Twin Metabólico atualizado",
      description: `Classificação: ${twin.response_classification} | Confiança: ${twin.model_confidence}%`,
      metadata: { engine_version: ENGINE_VERSION, classification: twin.response_classification },
    });

    return new Response(JSON.stringify({
      success: true,
      engine_version: ENGINE_VERSION,
      twin,
      plateau,
      simulation,
      strategies,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
