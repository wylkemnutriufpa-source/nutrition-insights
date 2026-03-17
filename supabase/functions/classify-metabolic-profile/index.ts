import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "1.0.0";

// ========== TYPES ==========

interface WeightRecord {
  weight: number;
  date: string;
}

interface ClassificationResult {
  metabolic_response_type: string;
  confidence_score: number;
  dominant_pattern: string;
  clinical_interpretation: string;
  historical_loss_rate: number;
  regain_probability: number;
  plateau_probability: number;
  behavioral_consistency_score: number;
  yoyo_cycles: number;
  longest_plateau_weeks: number;
  total_history_weeks: number;
  net_change_kg: number;
}

// ========== CLASSIFICATION ENGINE ==========

function classifyMetabolicProfile(
  records: WeightRecord[],
  avgAdherence: number,
  mealCompliance: number,
  timelineWeeks: number
): ClassificationResult {
  const defaultResult: ClassificationResult = {
    metabolic_response_type: "unknown",
    confidence_score: 0.2,
    dominant_pattern: "insufficient_data",
    clinical_interpretation: "Dados insuficientes para classificação. Continue registrando para obter seu perfil metabólico.",
    historical_loss_rate: 0,
    regain_probability: 0.3,
    plateau_probability: 0.3,
    behavioral_consistency_score: 0.5,
    yoyo_cycles: 0,
    longest_plateau_weeks: 0,
    total_history_weeks: 0,
    net_change_kg: 0,
  };

  if (records.length < 3) return defaultResult;

  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstDate = new Date(sorted[0].date);
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const totalWeeks = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const netChange = sorted[sorted.length - 1].weight - sorted[0].weight;
  const avgWeeklyRate = netChange / totalWeeks;

  // Detect direction changes (yoyo cycles)
  let yoyoCycles = 0;
  let direction = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i].weight - sorted[i - 1].weight;
    const newDir = diff < -0.3 ? -1 : diff > 0.3 ? 1 : 0;
    if (newDir !== 0 && direction !== 0 && newDir !== direction) yoyoCycles++;
    if (newDir !== 0) direction = newDir;
  }

  // Detect plateaus
  let longestPlateau = 0;
  let currentPlateau = 0;
  let totalPlateaus = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].weight - sorted[i - 1].weight) < 0.3) {
      currentPlateau++;
      longestPlateau = Math.max(longestPlateau, currentPlateau);
    } else {
      if (currentPlateau >= 2) totalPlateaus++;
      currentPlateau = 0;
    }
  }
  const avgSpacingWeeks = totalWeeks / Math.max(1, sorted.length - 1);
  const longestPlateauWeeks = Math.round(longestPlateau * avgSpacingWeeks);

  // Detect regain episodes
  let regainEvents = 0;
  let minAfterLoss = sorted[0].weight;
  let peakLoss = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].weight < minAfterLoss) {
      peakLoss = sorted[0].weight - sorted[i].weight;
      minAfterLoss = sorted[i].weight;
    } else if (peakLoss > 2 && (sorted[i].weight - minAfterLoss) > peakLoss * 0.5) {
      regainEvents++;
      peakLoss = 0;
      minAfterLoss = sorted[i].weight;
    }
  }

  // Consistency score from weight variance
  const weeklyChanges: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const wks = (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / (7 * 24 * 60 * 60 * 1000);
    if (wks > 0) weeklyChanges.push((sorted[i].weight - sorted[i - 1].weight) / wks);
  }
  const meanChange = weeklyChanges.reduce((a, b) => a + b, 0) / Math.max(1, weeklyChanges.length);
  const variance = weeklyChanges.reduce((s, v) => s + (v - meanChange) ** 2, 0) / Math.max(1, weeklyChanges.length);
  const stdDev = Math.sqrt(variance);
  const weightConsistency = Math.max(0, Math.min(1, 1 - stdDev / 2));

  // Blend behavioral consistency with adherence and meal compliance
  const behavioralScore = (weightConsistency * 0.4) + (avgAdherence / 100 * 0.35) + (mealCompliance / 100 * 0.25);
  const consistencyScore = Math.round(Math.max(0, Math.min(1, behavioralScore)) * 100) / 100;

  // Initial response speed (first 4 weeks vs rest)
  let initialSpeed = 0;
  let laterSpeed = 0;
  if (sorted.length >= 5 && totalWeeks >= 6) {
    const midIdx = Math.min(Math.floor(sorted.length / 3), sorted.length - 2);
    const midDate = new Date(sorted[midIdx].date);
    const initialWeeks = Math.max(1, (midDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const laterWeeks = Math.max(1, (lastDate.getTime() - midDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    initialSpeed = (sorted[midIdx].weight - sorted[0].weight) / initialWeeks;
    laterSpeed = (sorted[sorted.length - 1].weight - sorted[midIdx].weight) / laterWeeks;
  }

  // ========== CLASSIFY ==========
  const hasSufficient = totalWeeks >= 4 && sorted.length >= 4;
  let responseType = "unknown";
  let dominantPattern = "insufficient_data";
  let interpretation = "Dados em análise.";

  if (hasSufficient) {
    // behavioral_inconsistent: low consistency + high variance
    if (consistencyScore < 0.35 && stdDev > 1.0) {
      responseType = "behavioral_inconsistent";
      dominantPattern = "high_behavioral_variance";
      interpretation = "Variação grande no peso associada a inconsistência comportamental. Estabilizar hábitos é prioridade antes de ajustes calóricos.";
    }
    // weight_cycler: clear yoyo pattern
    else if (yoyoCycles >= 3 || regainEvents >= 2) {
      responseType = "weight_cycler";
      dominantPattern = "loss_regain_cycles";
      interpretation = "Resposta inicial rápida seguida de recuperação parcial. Priorizar consolidação e transições graduais.";
    }
    // plateau_prone
    else if (longestPlateauWeeks >= 4 || (longestPlateau / Math.max(1, sorted.length)) > 0.4) {
      responseType = "plateau_prone";
      dominantPattern = "frequent_stagnation";
      interpretation = "Tendência a estagnação em fases intermediárias. Variação calórica periódica e refeeds podem ajudar.";
    }
    // rapid_responder: fast initial, then slows
    else if (avgWeeklyRate < -0.7 || (initialSpeed < -0.6 && Math.abs(laterSpeed) < Math.abs(initialSpeed) * 0.5)) {
      responseType = "rapid_responder";
      dominantPattern = "fast_initial_response";
      interpretation = "Metabolismo responsivo nas primeiras semanas. Planejar transição para manutenção antes de platô.";
    }
    // resistant_metabolism: low response despite good adherence
    else if (avgAdherence >= 65 && mealCompliance >= 60 && Math.abs(avgWeeklyRate) < 0.1 && totalWeeks >= 6) {
      responseType = "resistant_metabolism";
      dominantPattern = "low_response_high_adherence";
      interpretation = "Resposta fraca apesar de boa adesão. Considerar ajustes mais intensivos ou investigação metabólica complementar.";
    }
    // stable_transformer: consistent progressive loss
    else if (avgWeeklyRate <= -0.15 && avgWeeklyRate >= -0.7 && consistencyScore >= 0.6 && yoyoCycles <= 1) {
      responseType = "stable_transformer";
      dominantPattern = "progressive_stable_loss";
      interpretation = "Perda progressiva estável e sustentável. Manter protocolo atual e priorizar qualidade nutricional.";
    }
    // slow_responder
    else if (avgWeeklyRate < -0.05 && avgWeeklyRate >= -0.15) {
      responseType = "slow_responder";
      dominantPattern = "gradual_consistent_loss";
      interpretation = "Perda lenta porém constante. Manter consistência a longo prazo com ajustes pequenos e frequentes.";
    }
    // Fallback
    else if (Math.abs(avgWeeklyRate) <= 0.05 && consistencyScore > 0.7) {
      responseType = "stable_transformer";
      dominantPattern = "maintenance_stable";
      interpretation = "Metabolismo em equilíbrio. Manter protocolo e monitorar para ajustes futuros.";
    } else {
      responseType = "slow_responder";
      dominantPattern = "mixed_signals";
      interpretation = "Padrão misto detectado. Continue registrando para refinar a classificação.";
    }
  }

  // Probabilities
  const regainProb = Math.min(1, 0.1 + regainEvents * 0.25 + yoyoCycles * 0.1);
  const plateauProb = Math.min(1, 0.1 + (longestPlateauWeeks / Math.max(1, totalWeeks)) * 0.8 + (responseType === "plateau_prone" ? 0.2 : 0));

  // Confidence calculation
  let confidence = 0.3;
  if (hasSufficient) confidence += 0.15;
  if (totalWeeks >= 8) confidence += 0.1;
  if (sorted.length >= 8) confidence += 0.1;
  confidence += consistencyScore * 0.15;
  if (avgAdherence >= 70) confidence += 0.05;
  if (responseType === "behavioral_inconsistent") confidence -= 0.05;
  confidence = Math.round(Math.min(0.95, Math.max(0.15, confidence)) * 100) / 100;

  return {
    metabolic_response_type: responseType,
    confidence_score: confidence,
    dominant_pattern: dominantPattern,
    clinical_interpretation: interpretation,
    historical_loss_rate: Math.round(avgWeeklyRate * 1000) / 1000,
    regain_probability: Math.round(regainProb * 100) / 100,
    plateau_probability: Math.round(plateauProb * 100) / 100,
    behavioral_consistency_score: consistencyScore,
    yoyo_cycles: yoyoCycles,
    longest_plateau_weeks: longestPlateauWeeks,
    total_history_weeks: Math.round(totalWeeks),
    net_change_kg: Math.round(netChange * 10) / 10,
  };
}

// ========== NARRATIVE GENERATION ==========

function generateMetabolicNarrative(result: ClassificationResult): string {
  const typeNarratives: Record<string, string> = {
    rapid_responder: "Seu metabolismo responde rapidamente quando há consistência. O próximo passo será consolidar esse avanço e evitar déficits prolongados.",
    slow_responder: "Seu perfil mostra evolução lenta porém constante. Paciência e consistência são seus maiores aliados neste momento.",
    plateau_prone: "Seu histórico mostra tendência a fases de estagnação. Por isso, o plano prioriza variações calóricas estratégicas para manter o metabolismo ativo.",
    weight_cycler: "Seu perfil mostra tendência a responder bem no início, mas com risco de recuperação parcial. O plano atual prioriza transições graduais e fase de consolidação longa.",
    resistant_metabolism: "Apesar de boa adesão, a resposta metabólica está abaixo do esperado. Pode ser necessário ajustes mais intensivos ou avaliação complementar.",
    behavioral_inconsistent: "A variação no seu progresso está associada a oscilações na consistência. Estabilizar os hábitos diários é o foco prioritário antes de ajustes calóricos.",
    stable_transformer: "Seu metabolismo está respondendo de forma progressiva e estável. Manter o protocolo atual e priorizar qualidade nutricional é a melhor estratégia.",
    unknown: "Ainda estamos acumulando dados suficientes para personalizar completamente seu perfil metabólico. Continue registrando suas refeições e check-ins.",
  };
  return typeNarratives[result.metabolic_response_type] || typeNarratives.unknown;
}

// ========== MAIN ==========

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { patient_id, trigger_source = "manual" } = await req.json();
    const targetPatient = patient_id || user.id;

    // === GATHER DATA ===

    // Weight history (retroactive + checkins)
    const [historyRes, checkinsRes, profileRes, mealCompRes] = await Promise.all([
      supabase.from("patient_weight_history").select("weight_kg, recorded_at").eq("patient_id", targetPatient).order("recorded_at", { ascending: true }),
      supabase.from("weight_checkins").select("weight, checked_at, adherence_score").eq("patient_id", targetPatient).order("checked_at", { ascending: true }),
      supabase.from("profiles").select("metabolic_response_type, metabolic_last_evaluated_at").eq("user_id", targetPatient).single(),
      supabase.from("meal_plan_items").select("adherence_status").eq("patient_id", targetPatient).eq("completed", true),
    ]);

    // Build unified weight records
    const weightRecords: WeightRecord[] = [];
    const seenDates = new Set<string>();

    for (const h of (historyRes.data || [])) {
      const d = h.recorded_at?.split("T")[0];
      if (d && !seenDates.has(d)) {
        seenDates.add(d);
        weightRecords.push({ weight: h.weight_kg, date: d });
      }
    }
    for (const c of (checkinsRes.data || [])) {
      const d = c.checked_at?.split("T")[0];
      if (d && !seenDates.has(d)) {
        seenDates.add(d);
        weightRecords.push({ weight: c.weight, date: d });
      }
    }

    // Avg adherence
    const adherenceScores = (checkinsRes.data || []).filter(c => c.adherence_score != null).map(c => c.adherence_score!);
    const avgAdherence = adherenceScores.length > 0
      ? adherenceScores.reduce((a, b) => a + b, 0) / adherenceScores.length
      : 50;

    // Meal compliance
    const mealItems = mealCompRes.data || [];
    const followedCount = mealItems.filter((m: any) => m.adherence_status === "followed").length;
    const mealCompliance = mealItems.length > 0 ? (followedCount / mealItems.length) * 100 : 50;

    // Timeline weeks
    const timelineWeeks = weightRecords.length >= 2
      ? Math.max(1, (new Date(weightRecords[weightRecords.length - 1]?.date || "").getTime() - new Date(weightRecords[0]?.date || "").getTime()) / (7 * 24 * 60 * 60 * 1000))
      : 0;

    // === CLASSIFY ===
    const result = classifyMetabolicProfile(weightRecords, avgAdherence, mealCompliance, timelineWeeks);
    const narrative = generateMetabolicNarrative(result);
    const previousType = profileRes.data?.metabolic_response_type || null;

    // === PERSIST ===

    // Update profiles
    await supabase.from("profiles").update({
      metabolic_response_type: result.metabolic_response_type,
      metabolic_confidence_score: result.confidence_score,
      metabolic_last_evaluated_at: new Date().toISOString(),
      historical_loss_rate: result.historical_loss_rate,
      regain_probability: result.regain_probability,
      plateau_probability: result.plateau_probability,
      behavioral_consistency_score: result.behavioral_consistency_score,
    }).eq("user_id", targetPatient);

    // Save classification history
    await supabase.from("metabolic_classification_history").insert({
      patient_id: targetPatient,
      metabolic_response_type: result.metabolic_response_type,
      previous_type: previousType,
      confidence_score: result.confidence_score,
      dominant_pattern: result.dominant_pattern,
      clinical_interpretation: result.clinical_interpretation,
      classification_data: {
        historical_loss_rate: result.historical_loss_rate,
        regain_probability: result.regain_probability,
        plateau_probability: result.plateau_probability,
        behavioral_consistency_score: result.behavioral_consistency_score,
        yoyo_cycles: result.yoyo_cycles,
        longest_plateau_weeks: result.longest_plateau_weeks,
        total_history_weeks: result.total_history_weeks,
        net_change_kg: result.net_change_kg,
        avg_adherence: avgAdherence,
        meal_compliance: mealCompliance,
        weight_records_count: weightRecords.length,
      },
      trigger_source,
      engine_version: ENGINE_VERSION,
      created_by: user.id,
    });

    return new Response(JSON.stringify({
      metabolic_response_type: result.metabolic_response_type,
      confidence_score: result.confidence_score,
      dominant_pattern: result.dominant_pattern,
      clinical_interpretation: result.clinical_interpretation,
      narrative,
      previous_type: previousType,
      changed: previousType !== result.metabolic_response_type,
      data_points: weightRecords.length,
      timeline_weeks: Math.round(timelineWeeks),
      engine_version: ENGINE_VERSION,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("classify-metabolic-profile error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
