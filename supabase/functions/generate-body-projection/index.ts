import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_DAYS = 30;
const ENGINE_VERSION = "2.0.0";

// ========== TYPES ==========

interface WeightRecord {
  weight: number;
  date: string;
  body_fat_percentage?: number | null;
}

interface HistoricalAnalysis {
  metabolic_response_type: string;
  historical_loss_rate: number;
  regain_probability: number;
  plateau_probability: number;
  behavioral_consistency_score: number;
  yoyo_cycles: number;
  longest_plateau_weeks: number;
  total_history_weeks: number;
  net_change_kg: number;
  has_sufficient_history: boolean;
}

// ========== HISTORICAL ANALYSIS ENGINE ==========

function analyzeWeightHistory(records: WeightRecord[]): HistoricalAnalysis {
  const empty: HistoricalAnalysis = {
    metabolic_response_type: "unknown",
    historical_loss_rate: 0,
    regain_probability: 0.3,
    plateau_probability: 0.3,
    behavioral_consistency_score: 0.5,
    yoyo_cycles: 0,
    longest_plateau_weeks: 0,
    total_history_weeks: 0,
    net_change_kg: 0,
    has_sufficient_history: false,
  };

  if (records.length < 3) return empty;

  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstDate = new Date(sorted[0].date);
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const totalWeeks = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const netChange = sorted[sorted.length - 1].weight - sorted[0].weight;
  const avgWeeklyRate = netChange / totalWeeks;

  let yoyoCycles = 0, direction = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i].weight - sorted[i - 1].weight;
    const newDir = diff < -0.3 ? -1 : diff > 0.3 ? 1 : 0;
    if (newDir !== 0 && direction !== 0 && newDir !== direction) yoyoCycles++;
    if (newDir !== 0) direction = newDir;
  }

  let longestPlateau = 0, currentPlateau = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].weight - sorted[i - 1].weight) < 0.5) {
      currentPlateau++;
      longestPlateau = Math.max(longestPlateau, currentPlateau);
    } else currentPlateau = 0;
  }
  const avgSpacing = totalWeeks / Math.max(1, sorted.length - 1);
  const longestPlateauWeeks = Math.round(longestPlateau * avgSpacing);

  let regainEvents = 0, minAfterLoss = sorted[0].weight, peakLoss = 0;
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

  const weeklyChanges: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const w = (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / (7 * 24 * 60 * 60 * 1000);
    if (w > 0) weeklyChanges.push((sorted[i].weight - sorted[i - 1].weight) / w);
  }
  const mean = weeklyChanges.reduce((a, b) => a + b, 0) / Math.max(1, weeklyChanges.length);
  const variance = weeklyChanges.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, weeklyChanges.length);
  const consistencyScore = Math.max(0, Math.min(1, 1 - Math.sqrt(variance) / 2));

  const hasSufficient = totalWeeks >= 4 && sorted.length >= 4;
  let responseType = "unknown";
  if (hasSufficient) {
    if (consistencyScore < 0.35 && Math.sqrt(variance) > 1.0) responseType = "behavioral_inconsistent";
    else if (yoyoCycles >= 3 || regainEvents >= 2) responseType = "weight_cycler";
    else if (longestPlateauWeeks >= 3 || (longestPlateau / Math.max(1, sorted.length)) > 0.4) responseType = "plateau_prone";
    else if (avgWeeklyRate < -0.7) responseType = "rapid_responder";
    else if (avgWeeklyRate <= -0.15 && consistencyScore >= 0.6 && yoyoCycles <= 1) responseType = "stable_transformer";
    else if (avgWeeklyRate < -0.05) responseType = "slow_responder";
    else if (Math.abs(avgWeeklyRate) <= 0.15 && consistencyScore > 0.7) responseType = "stable_transformer";
    else responseType = "slow_responder";
  }

  return {
    metabolic_response_type: responseType,
    historical_loss_rate: Math.round(avgWeeklyRate * 1000) / 1000,
    regain_probability: Math.min(1, Math.round((0.1 + regainEvents * 0.25 + yoyoCycles * 0.1) * 100) / 100),
    plateau_probability: Math.min(1, Math.round((0.1 + (longestPlateauWeeks / Math.max(1, totalWeeks)) * 0.8 + (responseType === "plateau_prone" ? 0.2 : 0)) * 100) / 100),
    behavioral_consistency_score: Math.round(consistencyScore * 100) / 100,
    yoyo_cycles: yoyoCycles,
    longest_plateau_weeks: longestPlateauWeeks,
    total_history_weeks: Math.round(totalWeeks),
    net_change_kg: Math.round(netChange * 10) / 10,
    has_sufficient_history: hasSufficient,
  };
}

// ========== PROJECTION ENGINE (DETERMINISTIC CORE) ==========

const METABOLIC_ADAPTATION_RATES: Record<string, number> = {
  rapid_responder: 0.03,
  stable_transformer: 0.02,
  slow_responder: 0.015,
  plateau_prone: 0.04,
  weight_cycler: 0.035,
  behavioral_inconsistent: 0.02,
  resistant_metabolism: 0.05,
  unknown: 0.025,
};

function computeProjection(
  currentWeight: number,
  days: number,
  weeklyRate: number,
  analysis: HistoricalAnalysis,
  avgAdherence: number,
  currentBodyFat: number | null,
  height: number,
  sex: string,
  age: number | null,
) {
  const weeks = days / 7;
  let effectiveRate = weeklyRate;
  if (analysis.has_sufficient_history) {
    effectiveRate = weeklyRate * 0.4 + analysis.historical_loss_rate * 0.6;
  }

  const adherenceFactor = Math.max(0.3, avgAdherence / 100);
  const adaptRate = METABOLIC_ADAPTATION_RATES[analysis.metabolic_response_type] || 0.025;
  const metabolicAdaptation = Math.max(0.6, 1 - adaptRate * (days / 30));

  let rawProjection = currentWeight + (effectiveRate * weeks * adherenceFactor * metabolicAdaptation);

  let plateauPenalty = 0, regainPenalty = 0, curveType = "linear";
  switch (analysis.metabolic_response_type) {
    case "weight_cycler":
      regainPenalty = Math.abs(effectiveRate * weeks) * 0.4 * analysis.regain_probability;
      curveType = "oscillating"; break;
    case "plateau_prone":
      plateauPenalty = Math.abs(effectiveRate * weeks) * 0.3 * analysis.plateau_probability;
      curveType = "stepped"; break;
    case "rapid_responder":
      if (weeks > 12) plateauPenalty = Math.abs(effectiveRate * (weeks - 12)) * 0.2;
      curveType = "decelerating"; break;
    case "slow_responder": curveType = "gradual"; break;
    case "stable_transformer": curveType = "progressive"; break;
    case "behavioral_inconsistent":
      regainPenalty = Math.abs(effectiveRate * weeks) * 0.35;
      curveType = "erratic"; break;
    case "resistant_metabolism":
      plateauPenalty = Math.abs(effectiveRate * weeks) * 0.4;
      curveType = "flat"; break;
  }

  if (effectiveRate < 0) rawProjection += plateauPenalty + regainPenalty;
  else rawProjection -= plateauPenalty + regainPenalty;

  const maxLoss = 1.0 * weeks; // max 1kg/week
  const projectedWeight = Math.round(Math.max(rawProjection, currentWeight - maxLoss, currentWeight * 0.7) * 10) / 10;

  // Body fat projection
  const fatEstimate = currentBodyFat || (sex === "female" || sex === "feminino"
    ? (age ? Math.round((1.20 * (currentWeight / ((height / 100) ** 2)) + 0.23 * age - 5.4) * 10) / 10 : null)
    : (age ? Math.round((1.20 * (currentWeight / ((height / 100) ** 2)) + 0.23 * age - 16.2) * 10) / 10 : null));

  const weightDelta = projectedWeight - currentWeight;
  const projectedBodyFat = fatEstimate !== null
    ? Math.round(Math.max(5, fatEstimate + (weightDelta * (weightDelta < 0 ? 0.75 : 0.4) / currentWeight * 100)) * 10) / 10
    : null;

  const projectedBmi = projectedWeight / ((height / 100) ** 2);
  const adiposity = projectedBmi > 35 ? "very_high" : projectedBmi > 30 ? "high" : projectedBmi > 25 ? "moderate" : projectedBmi > 22 ? "low" : "very_low";

  // Plateau risk
  const plateauRisk = Math.min(1, Math.round((
    analysis.plateau_probability * 0.4 +
    (days > 90 ? 0.15 : 0) +
    (analysis.metabolic_response_type === "plateau_prone" ? 0.25 : 0) +
    (metabolicAdaptation < 0.85 ? 0.15 : 0)
  ) * 100) / 100);

  // Adherence prediction
  const adherencePrediction = Math.round(Math.max(20, avgAdherence * (1 - days / 1000)) * 10) / 10;

  // Confidence
  let confidence = 0.4;
  if (analysis.has_sufficient_history) confidence += 0.15;
  confidence += analysis.behavioral_consistency_score * 0.2;
  confidence += Math.min(0.15, avgAdherence / 500);
  if (analysis.metabolic_response_type === "stable_transformer") confidence += 0.08;
  if (analysis.metabolic_response_type === "weight_cycler") confidence -= 0.1;
  if (analysis.metabolic_response_type === "behavioral_inconsistent") confidence -= 0.1;
  confidence -= days / 2000;
  confidence = Math.round(Math.min(0.92, Math.max(0.15, confidence)) * 100) / 100;

  // Phase
  const phase = weightDelta < -3 ? "perda_ativa"
    : weightDelta < -1 ? "reducao_gradual"
    : weightDelta > 1 ? "recomposicao"
    : "consolidacao_metabolica";

  // Strategy
  const strategies: Record<string, string> = {
    weight_cycler: "Priorizar consolidação longa para quebrar o ciclo de recuperação. Déficit moderado com transições graduais.",
    plateau_prone: "Variações calóricas periódicas (refeed) para evitar estagnação. Monitorar marcadores metabólicos.",
    rapid_responder: "Aproveitar resposta inicial, planejar transição precoce para manutenção. Evitar déficit prolongado.",
    slow_responder: "Consistência a longo prazo. Ajustes calóricos pequenos e frequentes. Paciência é aliada.",
    stable_transformer: "Manter protocolo atual. Metabolismo equilibrado. Priorizar qualidade nutricional e progressão.",
    behavioral_inconsistent: "Estabilizar hábitos antes de ajustes calóricos. Simplificar plano e aumentar check-ins.",
    resistant_metabolism: "Ciclos calóricos ou investigação metabólica complementar. Avaliar sono e estresse.",
    unknown: "Continuar acompanhamento para personalização avançada do protocolo.",
  };

  const muscLevel = avgAdherence > 80 ? "moderate_to_high" : avgAdherence > 60 ? "moderate" : "low";
  const renderingProfile = sex === "feminino" || sex === "female" || sex === "F" ? "female"
    : sex === "masculino" || sex === "male" || sex === "M" ? "male" : "neutral";

  const visualStateSeed = {
    rendering_profile: renderingProfile,
    adiposity_level: adiposity,
    muscularity_level: muscLevel,
    body_frame_type: "medium",
    silhouette_class: `${adiposity}_${muscLevel}`,
    glow_intensity: confidence,
    transformation_magnitude: Math.min(1, Math.abs(weightDelta) / 15),
  };

  return {
    projectedWeight,
    projectedBodyFat,
    projectedBmi: Math.round(projectedBmi * 10) / 10,
    weightDelta: Math.round(weightDelta * 10) / 10,
    metabolicAdaptation: Math.round(metabolicAdaptation * 1000) / 1000,
    adherencePrediction,
    plateauRisk,
    confidence,
    phase,
    strategy: strategies[analysis.metabolic_response_type] || strategies.unknown,
    curveType,
    adiposity,
    visualStateSeed,
  };
}

// ========== MAIN HANDLER ==========

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { patient_id, timeframe = "90d", generation_source = "manual", assessment_id, force_override = false, generate_all_timeframes = false } = await req.json();
    const targetPatient = patient_id || user.id;
    const timeframes = generate_all_timeframes ? ["30d", "90d", "180d", "365d"] : [timeframe];

    // Check roles
    const { data: userRoles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const roles = (userRoles || []).map((r: any) => r.role);
    const isProfessional = roles.includes("nutritionist") || roles.includes("admin");

    // === COOLDOWN CHECK ===
    const { data: lastProjection } = await supabase
      .from("body_projection_snapshots")
      .select("id, created_at, locked_until")
      .eq("patient_id", targetPatient)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastProjection) {
      const lockedUntil = lastProjection.locked_until ? new Date(lastProjection.locked_until) : null;
      const now = new Date();
      if (lockedUntil && now < lockedUntil && (!force_override || !isProfessional)) {
        return new Response(JSON.stringify({
          error: "cooldown_active",
          message: "Projeção em período de espera",
          locked_until: lastProjection.locked_until,
          last_generated: lastProjection.created_at,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // === GATHER DATA ===
    const [profileRes, checkinsRes, snapshotsRes, weightHistoryRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", targetPatient).maybeSingle(),
      supabase.from("patient_checkins").select("*").eq("patient_id", targetPatient).order("created_at", { ascending: false }).limit(60),
      supabase.from("clinical_daily_snapshots").select("adherence_score").eq("patient_id", targetPatient).order("snapshot_date", { ascending: false }).limit(30),
      supabase.from("patient_weight_history").select("*").eq("patient_id", targetPatient).order("measurement_date", { ascending: true }).limit(200),
    ]);

    const profile = profileRes.data;
    const checkins = checkinsRes.data || [];
    const snapshots = snapshotsRes.data || [];
    const weightHistory = weightHistoryRes.data || [];

    // Merge weight records
    const allRecords: WeightRecord[] = [
      ...weightHistory.map((w: any) => ({ weight: w.weight, date: w.measurement_date, body_fat_percentage: w.body_fat_percentage })),
      ...checkins.filter((c: any) => c.weight).map((c: any) => ({ weight: c.weight, date: c.created_at, body_fat_percentage: null })),
    ];
    const seen = new Set<string>();
    const dedupedRecords = allRecords.filter(r => {
      const key = r.date.substring(0, 10);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const historicalAnalysis = analyzeWeightHistory(dedupedRecords);

    // Current metrics
    const weights = checkins.filter((c: any) => c.weight).map((c: any) => ({ weight: c.weight, date: c.created_at }));
    const currentWeight = weights[0]?.weight || profile?.weight || null;
    const startWeight = weights.length > 1 ? weights[weights.length - 1].weight : currentWeight;
    const weightChange = currentWeight && startWeight ? currentWeight - startWeight : 0;
    const avgAdherence = snapshots.length > 0
      ? snapshots.reduce((sum: number, s: any) => sum + (s.adherence_score || 0), 0) / snapshots.length
      : 50;

    const weeklyRate = weights.length > 1
      ? weightChange / Math.max(1, weights.length / 7)
      : historicalAnalysis.historical_loss_rate || -0.3;

    const sex = profile?.sex || profile?.gender || "neutral";
    const height = profile?.height || 170;
    const age = profile?.age || profile?.birth_date
      ? (profile.age || Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
      : null;
    const currentBodyFat = profile?.body_fat_percentage || null;
    const bmi = currentWeight ? currentWeight / ((height / 100) ** 2) : 25;
    const adiposity = bmi > 35 ? "very_high" : bmi > 30 ? "high" : bmi > 25 ? "moderate" : bmi > 22 ? "low" : "very_low";
    const renderingProfile = sex === "feminino" || sex === "female" || sex === "F" ? "female"
      : sex === "masculino" || sex === "male" || sex === "M" ? "male" : "neutral";

    const clinicalPhase = weeklyRate < -0.5 ? "perda_ativa"
      : weeklyRate < -0.1 ? "reducao_gradual"
      : weeklyRate < 0.1 ? "estabilizacao"
      : "recomposicao";

    const currentMetrics = {
      rendering_profile: renderingProfile,
      body_frame_type: "medium",
      adiposity_level: adiposity,
      muscularity_level: avgAdherence > 70 ? "moderate" : "low",
      weight: currentWeight,
      bmi: Math.round(bmi * 10) / 10,
      body_fat: currentBodyFat,
      clinical_phase: clinicalPhase,
      metabolic_response_type: historicalAnalysis.metabolic_response_type,
    };

    // === GENERATE AI NARRATIVE (Camada 2: only for 90d) ===
    let narrative = "";
    if (lovableKey && currentWeight) {
      try {
        const primaryProj = computeProjection(currentWeight, 90, weeklyRate, historicalAnalysis, avgAdherence, currentBodyFat, height, sex, age);

        const histContext = historicalAnalysis.has_sufficient_history
          ? `\nPerfil metabólico: ${historicalAnalysis.metabolic_response_type}
Taxa histórica: ${historicalAnalysis.historical_loss_rate}kg/sem
Ciclos sanfona: ${historicalAnalysis.yoyo_cycles}
Prob. platô: ${Math.round(historicalAnalysis.plateau_probability * 100)}%
Prob. recuperação: ${Math.round(historicalAnalysis.regain_probability * 100)}%
Consistência: ${Math.round(historicalAnalysis.behavioral_consistency_score * 100)}%`
          : "\nHistórico insuficiente para classificação metabólica avançada.";

        const prompt = `Você é um consultor de nutrição clínica do FitJourney. Gere uma narrativa motivacional em português brasileiro (4-5 frases) sobre a projeção corporal.

IMPORTANTE: Você NÃO calculou esses dados. Eles foram gerados pelo motor clínico proprietário FitJourney Intelligence Engine.

Dados do motor:
- Peso atual: ${currentWeight}kg → Projetado: ${primaryProj.projectedWeight}kg em 90 dias
- IMC: ${currentMetrics.bmi} → ${primaryProj.projectedBmi}
- % Gordura projetada: ${primaryProj.projectedBodyFat || "N/A"}%
- Adesão: ${Math.round(avgAdherence)}%
- Risco de platô: ${Math.round(primaryProj.plateauRisk * 100)}%
- Adaptação metabólica: ${Math.round(primaryProj.metabolicAdaptation * 100)}%
${histContext}

Regras:
- NUNCA prometa resultados exatos
- Use "tendência" e "estimativa", nunca "previsão" ou "certeza"
- Se houver padrão metabólico, mencione de forma educativa
- Inclua a estratégia recomendada
- Linguagem motivacional e empática
- Seja breve e impactante`;

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          narrative = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("AI narrative error:", e);
      }
    }

    // Fallback narrative
    if (!narrative && currentWeight) {
      const p = computeProjection(currentWeight, 90, weeklyRate, historicalAnalysis, avgAdherence, currentBodyFat, height, sex, age);
      const d = p.weightDelta;
      const typeLabel: Record<string, string> = {
        rapid_responder: "resposta rápida inicial",
        slow_responder: "resposta gradual e progressiva",
        plateau_prone: "tendência a períodos de estagnação",
        weight_cycler: "padrão de oscilação",
        stable_transformer: "transformação estável e consistente",
      };
      const note = historicalAnalysis.has_sufficient_history
        ? ` Seu perfil indica ${typeLabel[historicalAnalysis.metabolic_response_type] || "padrão em análise"}.`
        : "";
      narrative = d < -3
        ? `Mantendo ${Math.round(avgAdherence)}% de adesão, a tendência é de redução progressiva.${note} ${p.strategy}`
        : d < 0
        ? `Projeção indica redução gradual e saudável.${note} Progresso sustentável. ${p.strategy}`
        : `Trajetória sugere estabilização metabólica.${note} ${p.strategy}`;
    }

    // === PERSIST SNAPSHOTS ===
    const now = new Date();
    const validUntil = new Date(now.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    const lockedUntil = new Date(now.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    const allResults: any[] = [];

    for (const tf of timeframes) {
      const tfDays = parseInt(tf) || 90;
      const proj = currentWeight
        ? computeProjection(currentWeight, tfDays, weeklyRate, historicalAnalysis, avgAdherence, currentBodyFat, height, sex, age)
        : null;

      if (!proj) continue;

      const projectedMetrics = {
        rendering_profile: renderingProfile,
        adiposity_level: proj.adiposity,
        muscularity_level: proj.visualStateSeed.muscularity_level,
        projected_weight: proj.projectedWeight,
        projected_bmi: proj.projectedBmi,
        projected_body_fat: proj.projectedBodyFat,
        weight_delta: proj.weightDelta,
        confidence_score: proj.confidence,
        projected_phase: proj.phase,
        recommended_strategy: proj.strategy,
        curve_type: proj.curveType,
        historical_analysis: {
          metabolic_response_type: historicalAnalysis.metabolic_response_type,
          historical_loss_rate: historicalAnalysis.historical_loss_rate,
          regain_probability: historicalAnalysis.regain_probability,
          plateau_probability: historicalAnalysis.plateau_probability,
          behavioral_consistency_score: historicalAnalysis.behavioral_consistency_score,
          yoyo_cycles: historicalAnalysis.yoyo_cycles,
          longest_plateau_weeks: historicalAnalysis.longest_plateau_weeks,
          has_sufficient_history: historicalAnalysis.has_sufficient_history,
        },
      };

      const { data: saved } = await supabase.from("body_projection_snapshots").insert({
        patient_id: targetPatient,
        timeframe: tf,
        current_body_json: currentMetrics,
        projected_body_json: projectedMetrics,
        current_metrics_json: currentMetrics,
        projected_metrics_json: projectedMetrics,
        narrative: tf === "90d" ? narrative : null,
        confidence_score: proj.confidence,
        projected_body_fat: proj.projectedBodyFat,
        metabolic_adaptation_index: proj.metabolicAdaptation,
        adherence_prediction_score: proj.adherencePrediction,
        plateau_risk: proj.plateauRisk,
        visual_state_seed: proj.visualStateSeed,
        engine_version: ENGINE_VERSION,
        assessment_id: assessment_id || null,
        generation_source,
        valid_until: validUntil.toISOString(),
        locked_until: lockedUntil.toISOString(),
        created_by: user.id,
      }).select("id, created_at, timeframe").single();

      allResults.push({
        snapshot_id: saved?.id,
        timeframe: tf,
        projected_weight: proj.projectedWeight,
        projected_body_fat: proj.projectedBodyFat,
        projected_phase: proj.phase,
        confidence_score: proj.confidence,
        plateau_risk: proj.plateauRisk,
        metabolic_adaptation: proj.metabolicAdaptation,
        strategy: proj.strategy,
        weight_delta: proj.weightDelta,
        visual_state_seed: proj.visualStateSeed,
      });
    }

    // Update profile with metabolic classification
    if (historicalAnalysis.has_sufficient_history) {
      await supabase.from("profiles").update({
        metabolic_response_type: historicalAnalysis.metabolic_response_type,
        historical_loss_rate: historicalAnalysis.historical_loss_rate,
        regain_probability: historicalAnalysis.regain_probability,
        plateau_probability: historicalAnalysis.plateau_probability,
        behavioral_consistency_score: historicalAnalysis.behavioral_consistency_score,
        weight_history_analyzed_at: now.toISOString(),
      }).eq("user_id", targetPatient);
    }

    return new Response(JSON.stringify({
      success: true,
      engine_version: ENGINE_VERSION,
      architecture: "hybrid_deterministic_ai",
      snapshots: allResults,
      primary_snapshot_id: allResults.find(r => r.timeframe === "90d")?.snapshot_id || allResults[0]?.snapshot_id,
      generated_at: now.toISOString(),
      valid_until: validUntil.toISOString(),
      locked_until: lockedUntil.toISOString(),
      current_body: currentMetrics,
      narrative,
      timeframes,
      generation_source,
      weight_history_records: dedupedRecords.length,
      historical_analysis: historicalAnalysis,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Body projection error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
