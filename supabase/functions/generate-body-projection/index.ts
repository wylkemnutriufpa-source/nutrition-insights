import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_DAYS = 30;

// ========== HISTORICAL ANALYSIS ENGINE ==========

interface WeightRecord {
  weight: number;
  date: string;
  body_fat_percentage?: number | null;
}

interface HistoricalAnalysis {
  metabolic_response_type: string;
  historical_loss_rate: number; // kg/week average
  regain_probability: number;  // 0-1
  plateau_probability: number; // 0-1
  behavioral_consistency_score: number; // 0-1
  yoyo_cycles: number;
  longest_plateau_weeks: number;
  total_history_weeks: number;
  net_change_kg: number;
  has_sufficient_history: boolean;
}

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

  // Sort by date ascending
  const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const firstDate = new Date(sorted[0].date);
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const totalWeeks = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const netChange = sorted[sorted.length - 1].weight - sorted[0].weight;
  const avgWeeklyRate = netChange / totalWeeks;

  // Detect direction changes (yoyo cycles)
  let yoyoCycles = 0;
  let direction = 0; // -1 losing, +1 gaining, 0 stable
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i].weight - sorted[i - 1].weight;
    const newDir = diff < -0.3 ? -1 : diff > 0.3 ? 1 : 0;
    if (newDir !== 0 && direction !== 0 && newDir !== direction) {
      yoyoCycles++;
    }
    if (newDir !== 0) direction = newDir;
  }

  // Detect plateau periods (weight change < 0.3kg over consecutive records)
  let longestPlateau = 0;
  let currentPlateau = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].weight - sorted[i - 1].weight) < 0.3) {
      currentPlateau++;
      longestPlateau = Math.max(longestPlateau, currentPlateau);
    } else {
      currentPlateau = 0;
    }
  }
  // Approximate plateau weeks based on record spacing
  const avgRecordSpacingWeeks = totalWeeks / Math.max(1, sorted.length - 1);
  const longestPlateauWeeks = Math.round(longestPlateau * avgRecordSpacingWeeks);

  // Detect regain episodes: losing >2kg then regaining >50% of it
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

  // Consistency: measure variance of weekly changes
  const weeklyChanges: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const weeksBetween = (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / (7 * 24 * 60 * 60 * 1000);
    if (weeksBetween > 0) {
      weeklyChanges.push((sorted[i].weight - sorted[i - 1].weight) / weeksBetween);
    }
  }
  const meanChange = weeklyChanges.reduce((a, b) => a + b, 0) / Math.max(1, weeklyChanges.length);
  const variance = weeklyChanges.reduce((sum, v) => sum + (v - meanChange) ** 2, 0) / Math.max(1, weeklyChanges.length);
  const stdDev = Math.sqrt(variance);
  const consistencyScore = Math.max(0, Math.min(1, 1 - stdDev / 2));

  // Classify metabolic response type
  let responseType = "unknown";
  const hasSufficient = totalWeeks >= 4 && sorted.length >= 4;

  if (hasSufficient) {
    if (consistencyScore < 0.35 && stdDev > 1.0) {
      responseType = "behavioral_inconsistent";
    } else if (yoyoCycles >= 3 || regainEvents >= 2) {
      responseType = "weight_cycler";
    } else if (longestPlateauWeeks >= 4 || (longestPlateau / Math.max(1, sorted.length)) > 0.4) {
      responseType = "plateau_prone";
    } else if (avgWeeklyRate < -0.7) {
      responseType = "rapid_responder";
    } else if (avgWeeklyRate <= -0.15 && avgWeeklyRate >= -0.7 && consistencyScore >= 0.6 && yoyoCycles <= 1) {
      responseType = "stable_transformer";
    } else if (avgWeeklyRate < -0.05 && avgWeeklyRate >= -0.15) {
      responseType = "slow_responder";
    } else if (Math.abs(avgWeeklyRate) <= 0.15 && consistencyScore > 0.7) {
      responseType = "stable_transformer";
    } else if (avgWeeklyRate < 0) {
      responseType = "slow_responder";
    } else {
      responseType = "slow_responder";
    }
  }

  const regainProb = Math.min(1, 0.1 + regainEvents * 0.25 + yoyoCycles * 0.1);
  const plateauProb = Math.min(1, 0.1 + (longestPlateauWeeks / Math.max(1, totalWeeks)) * 0.8 + (responseType === "plateau_prone" ? 0.2 : 0));

  return {
    metabolic_response_type: responseType,
    historical_loss_rate: Math.round(avgWeeklyRate * 1000) / 1000,
    regain_probability: Math.round(regainProb * 100) / 100,
    plateau_probability: Math.round(plateauProb * 100) / 100,
    behavioral_consistency_score: Math.round(consistencyScore * 100) / 100,
    yoyo_cycles: yoyoCycles,
    longest_plateau_weeks: longestPlateauWeeks,
    total_history_weeks: Math.round(totalWeeks),
    net_change_kg: Math.round(netChange * 10) / 10,
    has_sufficient_history: hasSufficient,
  };
}

// ========== ADJUSTED PROJECTION ENGINE ==========

function computeAdjustedProjection(
  currentWeight: number,
  timeframeDays: number,
  checkinWeeklyRate: number,
  analysis: HistoricalAnalysis,
  avgAdherence: number
): { projectedWeight: number; adjustedConfidence: number; projectedPhase: string; strategy: string; curveType: string } {
  
  // Blend checkin rate with historical rate (historical has more weight when sufficient)
  let effectiveRate = checkinWeeklyRate;
  if (analysis.has_sufficient_history) {
    effectiveRate = checkinWeeklyRate * 0.4 + analysis.historical_loss_rate * 0.6;
  }

  const weeks = timeframeDays / 7;
  let baseProjection = currentWeight + effectiveRate * weeks;

  // Apply metabolic-type adjustments
  let plateauPenalty = 0;
  let regainPenalty = 0;
  let curveType = "linear";

  switch (analysis.metabolic_response_type) {
    case "weight_cycler":
      // Expect regain midway: reduce net loss by 30-50%
      regainPenalty = Math.abs(effectiveRate * weeks) * 0.4 * analysis.regain_probability;
      curveType = "oscillating";
      break;
    case "plateau_prone":
      // Expect stall: reduce progress by plateau probability
      plateauPenalty = Math.abs(effectiveRate * weeks) * 0.3 * analysis.plateau_probability;
      curveType = "stepped";
      break;
    case "rapid_responder":
      // Initial fast then decelerating
      if (weeks > 12) {
        plateauPenalty = Math.abs(effectiveRate * (weeks - 12)) * 0.2;
      }
      curveType = "decelerating";
      break;
    case "slow_responder":
      // Gradual but steady
      curveType = "gradual";
      break;
    case "stable_maintainer":
      curveType = "stable";
      break;
    default:
      curveType = "linear";
  }

  // Apply penalties (penalties always push toward less change)
  if (effectiveRate < 0) {
    // Losing weight: penalties reduce the loss
    baseProjection += plateauPenalty + regainPenalty;
  } else {
    // Gaining weight: penalties reduce the gain (less relevant)
    baseProjection -= plateauPenalty + regainPenalty;
  }

  const projectedWeight = Math.round(Math.max(baseProjection, currentWeight * 0.7) * 10) / 10;

  // Adjusted confidence
  let confidence = 0.4;
  if (analysis.has_sufficient_history) confidence += 0.15;
  confidence += analysis.behavioral_consistency_score * 0.2;
  confidence += Math.min(0.15, avgAdherence / 500);
  if (analysis.metabolic_response_type === "weight_cycler") confidence -= 0.1;
  if (analysis.metabolic_response_type === "plateau_prone") confidence -= 0.05;
  if (analysis.metabolic_response_type === "rapid_responder") confidence += 0.05;
  confidence = Math.round(Math.min(0.92, Math.max(0.15, confidence)) * 100) / 100;

  // Phase determination
  const delta = projectedWeight - currentWeight;
  let projectedPhase = "estabilizacao";
  if (delta < -3) projectedPhase = "perda_ativa";
  else if (delta < -1) projectedPhase = "reducao_gradual";
  else if (delta > 1) projectedPhase = "recomposicao";
  else projectedPhase = "consolidacao_metabolica";

  // Strategy
  let strategy = "";
  switch (analysis.metabolic_response_type) {
    case "weight_cycler":
      strategy = "Priorizar fase de consolidação longa para quebrar o ciclo de recuperação. Déficit calórico moderado com transições graduais.";
      break;
    case "plateau_prone":
      strategy = "Implementar variações calóricas periódicas (refeed) para evitar estagnação. Monitorar marcadores metabólicos com frequência.";
      break;
    case "rapid_responder":
      strategy = "Aproveitar a resposta inicial, mas planejar transição precoce para manutenção. Evitar déficit prolongado.";
      break;
    case "slow_responder":
      strategy = "Manter consistência a longo prazo. Ajustes calóricos pequenos e frequentes. Paciência é o principal aliado.";
      break;
    case "stable_maintainer":
      strategy = "Manter protocolo atual. O metabolismo está respondendo de forma equilibrada. Priorizar qualidade nutricional.";
      break;
    default:
      strategy = "Continuar acompanhamento para acumular dados suficientes para personalização avançada do protocolo.";
  }

  return { projectedWeight, adjustedConfidence: confidence, projectedPhase, strategy, curveType };
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

    const { patient_id, timeframe = "90d", generation_source = "manual", assessment_id, force_override = false } = await req.json();
    const targetPatient = patient_id || user.id;

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

    // === GATHER DATA (including weight history) ===
    const [profileRes, checkinsRes, snapshotsRes, photosRes, weightHistoryRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", targetPatient).maybeSingle(),
      supabase.from("patient_checkins").select("*").eq("patient_id", targetPatient).order("created_at", { ascending: false }).limit(60),
      supabase.from("clinical_daily_snapshots").select("*").eq("patient_id", targetPatient).order("snapshot_date", { ascending: false }).limit(30),
      supabase.from("body_assessment_photos").select("*").eq("patient_id", targetPatient).order("assessment_date", { ascending: false }).limit(5),
      supabase.from("patient_weight_history").select("*").eq("patient_id", targetPatient).order("measurement_date", { ascending: true }).limit(200),
    ]);

    const profile = profileRes.data;
    const checkins = checkinsRes.data || [];
    const snapshots = snapshotsRes.data || [];
    const photos = photosRes.data || [];
    const weightHistory = weightHistoryRes.data || [];

    // === HISTORICAL ANALYSIS ===
    // Combine weight history + checkins into unified timeline
    const allWeightRecords: WeightRecord[] = [
      ...weightHistory.map((w: any) => ({ weight: w.weight, date: w.measurement_date, body_fat_percentage: w.body_fat_percentage })),
      ...checkins.filter((c: any) => c.weight).map((c: any) => ({ weight: c.weight, date: c.created_at, body_fat_percentage: null })),
    ];

    // Deduplicate by date (keep first per date)
    const seen = new Set<string>();
    const dedupedRecords = allWeightRecords.filter(r => {
      const dateKey = r.date.substring(0, 10);
      if (seen.has(dateKey)) return false;
      seen.add(dateKey);
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const historicalAnalysis = analyzeWeightHistory(dedupedRecords);

    // === DETERMINISTIC ENGINE ===
    const weights = checkins.filter((c: any) => c.weight).map((c: any) => ({ weight: c.weight, date: c.created_at }));
    const currentWeight = weights[0]?.weight || profile?.weight || null;
    const startWeight = weights.length > 1 ? weights[weights.length - 1].weight : currentWeight;
    const weightChange = currentWeight && startWeight ? currentWeight - startWeight : 0;
    const avgAdherence = snapshots.length > 0
      ? snapshots.reduce((sum: number, s: any) => sum + (s.adherence_score || 0), 0) / snapshots.length
      : 50;

    const timeframeDays = parseInt(timeframe) || 90;
    const checkinWeeklyRate = weights.length > 1
      ? weightChange / Math.max(1, weights.length / 7)
      : -0.3;

    // Use adjusted projection with historical data
    const projection = currentWeight
      ? computeAdjustedProjection(currentWeight, timeframeDays, checkinWeeklyRate, historicalAnalysis, avgAdherence)
      : { projectedWeight: null, adjustedConfidence: 0.3, projectedPhase: "unknown", strategy: "", curveType: "linear" };

    const sex = profile?.sex || profile?.gender || "neutral";
    const renderingProfile = sex === "feminino" || sex === "female" || sex === "F" ? "female"
      : sex === "masculino" || sex === "male" || sex === "M" ? "male"
      : "neutral";

    const height = profile?.height || 170;
    const bmi = currentWeight ? currentWeight / ((height / 100) ** 2) : 25;
    const adiposityLevel = bmi > 35 ? "very_high" : bmi > 30 ? "high" : bmi > 25 ? "moderate" : bmi > 22 ? "low" : "very_low";
    const projectedBmi = projection.projectedWeight ? projection.projectedWeight / ((height / 100) ** 2) : bmi;
    const projectedAdiposity = projectedBmi > 35 ? "very_high" : projectedBmi > 30 ? "high" : projectedBmi > 25 ? "moderate" : projectedBmi > 22 ? "low" : "very_low";

    const clinicalPhase = checkinWeeklyRate < -0.5 ? "perda_ativa"
      : checkinWeeklyRate < -0.1 ? "reducao_gradual"
      : checkinWeeklyRate < 0.1 ? "estabilizacao"
      : "recomposicao";

    const currentMetrics = {
      rendering_profile: renderingProfile,
      body_frame_type: "medium",
      adiposity_level: adiposityLevel,
      muscularity_level: avgAdherence > 70 ? "moderate" : "low",
      weight: currentWeight,
      bmi: Math.round(bmi * 10) / 10,
      confidence_score: projection.adjustedConfidence,
      clinical_phase: clinicalPhase,
      metabolic_response_type: historicalAnalysis.metabolic_response_type,
    };

    const projectedMetrics = {
      rendering_profile: renderingProfile,
      adiposity_level: projectedAdiposity,
      muscularity_level: avgAdherence > 60 ? "moderate_to_high" : "moderate",
      projected_weight: projection.projectedWeight,
      projected_bmi: Math.round(projectedBmi * 10) / 10,
      weight_delta: projection.projectedWeight && currentWeight ? Math.round((projection.projectedWeight - currentWeight) * 10) / 10 : 0,
      confidence_score: projection.adjustedConfidence,
      projected_phase: projection.projectedPhase,
      recommended_strategy: projection.strategy,
      curve_type: projection.curveType,
      // Historical context
      historical_analysis: {
        metabolic_response_type: historicalAnalysis.metabolic_response_type,
        historical_loss_rate: historicalAnalysis.historical_loss_rate,
        regain_probability: historicalAnalysis.regain_probability,
        plateau_probability: historicalAnalysis.plateau_probability,
        behavioral_consistency_score: historicalAnalysis.behavioral_consistency_score,
        yoyo_cycles: historicalAnalysis.yoyo_cycles,
        longest_plateau_weeks: historicalAnalysis.longest_plateau_weeks,
        total_history_weeks: historicalAnalysis.total_history_weeks,
        has_sufficient_history: historicalAnalysis.has_sufficient_history,
      },
    };

    // === AI NARRATIVE (considers historical patterns) ===
    let narrative = "";
    if (lovableKey) {
      try {
        const histContext = historicalAnalysis.has_sufficient_history
          ? `\nPerfil metabólico: ${historicalAnalysis.metabolic_response_type}
Taxa histórica: ${historicalAnalysis.historical_loss_rate}kg/sem
Ciclos sanfona: ${historicalAnalysis.yoyo_cycles}
Prob. platô: ${Math.round(historicalAnalysis.plateau_probability * 100)}%
Prob. recuperação: ${Math.round(historicalAnalysis.regain_probability * 100)}%
Consistência: ${Math.round(historicalAnalysis.behavioral_consistency_score * 100)}%
Histórico total: ${historicalAnalysis.total_history_weeks} semanas`
          : "\nHistórico insuficiente para classificação metabólica avançada.";

        const prompt = `Você é um consultor de nutrição clínica. Gere uma narrativa motivacional em português brasileiro (4-5 frases) sobre a projeção corporal, considerando o histórico do paciente.

Dados atuais:
- Peso atual: ${currentWeight}kg → Projetado: ${projection.projectedWeight}kg em ${timeframeDays} dias
- IMC: ${currentMetrics.bmi} → ${projectedMetrics.projected_bmi}
- Adesão: ${Math.round(avgAdherence)}%
- Fase clínica atual: ${clinicalPhase}
- Fase projetada: ${projection.projectedPhase}
${histContext}

Regras:
- Não prometa resultados exatos
- DEVE mencionar o padrão metabólico se disponível (ex: "seu histórico mostra tendência a platôs")
- Linguagem motivacional e educativa
- Inclua recomendação estratégica baseada no perfil metabólico
- Seja breve e impactante
- Se houver risco de recuperação, mencione de forma positiva a estratégia de prevenção`;

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

    if (!narrative) {
      const delta = projectedMetrics.weight_delta;
      const typeLabel: Record<string, string> = {
        rapid_responder: "resposta rápida inicial",
        slow_responder: "resposta gradual e progressiva",
        plateau_prone: "tendência a períodos de estagnação",
        weight_cycler: "padrão de oscilação (efeito sanfona)",
        stable_maintainer: "estabilidade metabólica consistente",
      };
      const histNote = historicalAnalysis.has_sufficient_history
        ? ` Seu histórico mostra ${typeLabel[historicalAnalysis.metabolic_response_type] || "padrão ainda em análise"}.`
        : "";

      if (delta < -3) {
        narrative = `Mantendo sua consistência atual de ${Math.round(avgAdherence)}% de adesão, a tendência é de redução progressiva nos próximos ${timeframeDays} dias.${histNote} ${projection.strategy}`;
      } else if (delta < 0) {
        narrative = `A projeção indica uma redução gradual e saudável.${histNote} Com adesão de ${Math.round(avgAdherence)}%, o progresso é sustentável. ${projection.strategy}`;
      } else {
        narrative = `Sua trajetória sugere uma fase de estabilização metabólica.${histNote} ${projection.strategy}`;
      }
    }

    // === PERSIST SNAPSHOT ===
    const now = new Date();
    const validUntil = new Date(now.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    const lockedUntil = new Date(now.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

    const { data: savedSnapshot } = await supabase.from("body_projection_snapshots").insert({
      patient_id: targetPatient,
      timeframe,
      current_body_json: currentMetrics,
      projected_body_json: projectedMetrics,
      current_metrics_json: currentMetrics,
      projected_metrics_json: projectedMetrics,
      narrative,
      confidence_score: projection.adjustedConfidence,
      assessment_id: assessment_id || null,
      generation_source,
      valid_until: validUntil.toISOString(),
      locked_until: lockedUntil.toISOString(),
      created_by: user.id,
    }).select("id, created_at").single();

    // === UPDATE PROFILE with metabolic classification ===
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
      snapshot_id: savedSnapshot?.id,
      generated_at: savedSnapshot?.created_at || now.toISOString(),
      valid_until: validUntil.toISOString(),
      locked_until: lockedUntil.toISOString(),
      current_body: currentMetrics,
      projected_body: projectedMetrics,
      narrative,
      timeframe,
      generation_source,
      photos_count: photos.length,
      data_points: checkins.length,
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
