/**
 * ═══════════════════════════════════════════════════════════
 * FITJOURNEY BODY PROJECTION — Edge Function v2.1.0
 * ═══════════════════════════════════════════════════════════
 * 
 * ARQUITETURA HÍBRIDA:
 * 
 *   CAMADA 1 — Motor Determinístico (inline, idêntico ao client)
 *     → Calcula projeções de peso, gordura, platô, confiança
 *     → 100% matemático, zero IA
 * 
 *   CAMADA 2 — IA Generativa (Lovable AI Gateway)
 *     → Recebe dados JÁ CALCULADOS pelo motor
 *     → Gera narrativa motivacional para paciente
 *     → Gera resumo técnico para profissional
 *     → NÃO calcula, NÃO decide, NÃO projeta
 * 
 *   CAMADA 3 — Persistência Evolutiva
 *     → Salva snapshots versionados
 *     → Cooldown de 30 dias
 *     → Timeline comparativa
 * 
 * ═══════════════════════════════════════════════════════════
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isLLMEnabled } from "../_shared/llm-gate.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COOLDOWN_DAYS = 30;
const ENGINE_VERSION = "2.1.0";

// ╔═══════════════════════════════════════════════════════════╗
// ║  CAMADA 1 — MOTOR DETERMINÍSTICO CLÍNICO                 ║
// ║  Cálculo puro. Zero IA. Espelhado de bodyProjectionEngine ║
// ╚═══════════════════════════════════════════════════════════╝

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

interface DeterministicProjection {
  projected_weight: number;
  projected_body_fat: number | null;
  projected_bmi: number;
  weight_delta: number;
  metabolic_adaptation_index: number;
  adherence_prediction_score: number;
  plateau_risk: number;
  confidence_score: number;
  projected_phase: string;
  recommended_strategy: string;
  curve_type: string;
  adiposity_level: string;
  visual_state_seed: Record<string, unknown>;
}

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

const STRATEGIES: Record<string, string> = {
  weight_cycler: "Priorizar consolidação longa para quebrar o ciclo de recuperação. Déficit moderado com transições graduais.",
  plateau_prone: "Variações calóricas periódicas (refeed) para evitar estagnação. Monitorar marcadores metabólicos.",
  rapid_responder: "Aproveitar resposta inicial, planejar transição precoce para manutenção. Evitar déficit prolongado.",
  slow_responder: "Consistência a longo prazo. Ajustes calóricos pequenos e frequentes. Paciência é aliada.",
  stable_transformer: "Manter protocolo atual. Metabolismo equilibrado. Priorizar qualidade nutricional e progressão.",
  behavioral_inconsistent: "Estabilizar hábitos antes de ajustes calóricos. Simplificar plano e aumentar check-ins.",
  resistant_metabolism: "Ciclos calóricos ou investigação metabólica complementar. Avaliar sono e estresse.",
  unknown: "Continuar acompanhamento para personalização avançada do protocolo.",
};

/**
 * Analisa histórico de peso e classifica perfil metabólico.
 * 100% determinístico.
 */
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

/**
 * Computa projeção para um horizonte temporal específico.
 * 100% determinístico. A IA NÃO toca nesta função.
 */
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
): DeterministicProjection {
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

  const maxLoss = 1.0 * weeks;
  const projectedWeight = Math.round(Math.max(rawProjection, currentWeight - maxLoss, currentWeight * 0.7) * 10) / 10;

  const fatEstimate = currentBodyFat || (sex === "female" || sex === "feminino"
    ? (age ? Math.round((1.20 * (currentWeight / ((height / 100) ** 2)) + 0.23 * age - 5.4) * 10) / 10 : null)
    : (age ? Math.round((1.20 * (currentWeight / ((height / 100) ** 2)) + 0.23 * age - 16.2) * 10) / 10 : null));

  const weightDelta = projectedWeight - currentWeight;
  const projectedBodyFat = fatEstimate !== null
    ? Math.round(Math.max(5, fatEstimate + (weightDelta * (weightDelta < 0 ? 0.75 : 0.4) / currentWeight * 100)) * 10) / 10
    : null;

  const projectedBmi = projectedWeight / ((height / 100) ** 2);
  const adiposity = projectedBmi > 35 ? "very_high" : projectedBmi > 30 ? "high" : projectedBmi > 25 ? "moderate" : projectedBmi > 22 ? "low" : "very_low";

  const plateauRisk = Math.min(1, Math.round((
    analysis.plateau_probability * 0.4 +
    (days > 90 ? 0.15 : 0) +
    (analysis.metabolic_response_type === "plateau_prone" ? 0.25 : 0) +
    (metabolicAdaptation < 0.85 ? 0.15 : 0)
  ) * 100) / 100);

  const adherencePrediction = Math.round(Math.max(20, avgAdherence * (1 - days / 1000)) * 10) / 10;

  let confidence = 0.4;
  if (analysis.has_sufficient_history) confidence += 0.15;
  confidence += analysis.behavioral_consistency_score * 0.2;
  confidence += Math.min(0.15, avgAdherence / 500);
  if (analysis.metabolic_response_type === "stable_transformer") confidence += 0.08;
  if (analysis.metabolic_response_type === "weight_cycler") confidence -= 0.1;
  if (analysis.metabolic_response_type === "behavioral_inconsistent") confidence -= 0.1;
  confidence -= days / 2000;
  confidence = Math.round(Math.min(0.92, Math.max(0.15, confidence)) * 100) / 100;

  const phase = weightDelta < -3 ? "perda_ativa"
    : weightDelta < -1 ? "reducao_gradual"
    : weightDelta > 1 ? "recomposicao"
    : "consolidacao_metabolica";

  const muscLevel = avgAdherence > 80 ? "moderate_to_high" : avgAdherence > 60 ? "moderate" : "low";
  const renderingProfile = sex === "feminino" || sex === "female" || sex === "F" ? "female"
    : sex === "masculino" || sex === "male" || sex === "M" ? "male" : "neutral";

  return {
    projected_weight: projectedWeight,
    projected_body_fat: projectedBodyFat,
    projected_bmi: Math.round(projectedBmi * 10) / 10,
    weight_delta: Math.round(weightDelta * 10) / 10,
    metabolic_adaptation_index: Math.round(metabolicAdaptation * 1000) / 1000,
    adherence_prediction_score: adherencePrediction,
    plateau_risk: plateauRisk,
    confidence_score: confidence,
    projected_phase: phase,
    recommended_strategy: STRATEGIES[analysis.metabolic_response_type] || STRATEGIES.unknown,
    curve_type: curveType,
    adiposity_level: adiposity,
    visual_state_seed: {
      rendering_profile: renderingProfile,
      adiposity_level: adiposity,
      muscularity_level: muscLevel,
      body_frame_type: "medium",
      silhouette_class: `${adiposity}_${muscLevel}`,
      glow_intensity: confidence,
      transformation_magnitude: Math.min(1, Math.abs(weightDelta) / 15),
    },
  };
}

// ╔═══════════════════════════════════════════════════════════╗
// ║  CAMADA 2 — IA GENERATIVA (NARRATIVA + VISUAL)            ║
// ║  Recebe dados JÁ CALCULADOS. NÃO calcula. NÃO decide.    ║
// ╚═══════════════════════════════════════════════════════════╝

interface NarrativeInput {
  currentWeight: number;
  projection: DeterministicProjection;
  avgAdherence: number;
  historicalAnalysis: HistoricalAnalysis;
  patientName?: string;
}

/**
 * Gera narrativa motivacional para o PACIENTE via IA.
 * Linguagem acolhedora, motivacional, sem termos técnicos.
 */
async function generatePatientNarrative(input: NarrativeInput, apiKey: string): Promise<string> {
  const { currentWeight, projection: p, avgAdherence, historicalAnalysis: h } = input;

  const histContext = h.has_sufficient_history
    ? `Perfil metabólico: ${h.metabolic_response_type}. Taxa histórica: ${h.historical_loss_rate}kg/sem. Ciclos sanfona: ${h.yoyo_cycles}. Prob. platô: ${Math.round(h.plateau_probability * 100)}%.`
    : "Histórico insuficiente para classificação metabólica avançada.";

  const prompt = `Você é um consultor de nutrição clínica do FitJourney. Gere uma narrativa motivacional em português brasileiro (4-5 frases) para o PACIENTE sobre sua projeção corporal.

IMPORTANTE: Você NÃO calculou esses dados. Eles foram gerados pelo motor clínico proprietário FitJourney Intelligence Engine v${ENGINE_VERSION}.
Sua função é APENAS interpretar, explicar e motivar.

Dados do motor determinístico:
- Peso atual: ${currentWeight}kg → Projetado: ${p.projected_weight}kg em 90 dias
- IMC projetado: ${p.projected_bmi}
- % Gordura projetada: ${p.projected_body_fat || "N/A"}%
- Adesão atual: ${Math.round(avgAdherence)}%
- Risco de platô: ${Math.round(p.plateau_risk * 100)}%
- Adaptação metabólica: ${Math.round(p.metabolic_adaptation_index * 100)}%
- Fase projetada: ${p.projected_phase}
- Estratégia recomendada: ${p.recommended_strategy}
- Confiança: ${Math.round(p.confidence_score * 100)}%
- ${histContext}

Regras para narrativa do PACIENTE:
- NUNCA prometa resultados exatos
- Use "tendência" e "estimativa", nunca "previsão" ou "certeza"
- Se houver padrão metabólico, mencione de forma educativa e esperançosa
- Linguagem motivacional, empática e acolhedora
- Evite termos técnicos complexos
- Seja breve e impactante (4-5 frases)`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    if (res.status === 429 || res.status === 402) throw new Error(`ai_${res.status}`);
    throw new Error(`AI error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Gera resumo técnico para o PROFISSIONAL via IA.
 * Linguagem clínica, concisa, baseada em evidências.
 */
async function generateProfessionalSummary(input: NarrativeInput, apiKey: string): Promise<string> {
  const { currentWeight, projection: p, avgAdherence, historicalAnalysis: h } = input;

  const prompt = `Você é um assistente clínico do FitJourney. Gere um RESUMO TÉCNICO em português brasileiro (3-4 frases) para o NUTRICIONISTA sobre a projeção deste paciente.

IMPORTANTE: Os dados foram calculados pelo motor determinístico FitJourney v${ENGINE_VERSION}. Você interpreta, não calcula.

Dados do motor:
- Peso: ${currentWeight}kg → ${p.projected_weight}kg (Δ${p.weight_delta}kg em 90d)
- IMC projetado: ${p.projected_bmi} | % Gordura: ${p.projected_body_fat || "N/A"}%
- Perfil metabólico: ${h.metabolic_response_type} (${h.has_sufficient_history ? "classificado" : "insuficiente"})
- Taxa histórica: ${h.historical_loss_rate}kg/sem | Ciclos yo-yo: ${h.yoyo_cycles}
- Adesão: ${Math.round(avgAdherence)}% | Pred. adesão: ${p.adherence_prediction_score}%
- Risco platô: ${Math.round(p.plateau_risk * 100)}% | Adapt. metab.: ${Math.round(p.metabolic_adaptation_index * 100)}%
- Confiança: ${Math.round(p.confidence_score * 100)}% | Curva: ${p.curve_type}
- Fase: ${p.projected_phase} | Estratégia: ${p.recommended_strategy}

Regras para resumo PROFISSIONAL:
- Linguagem clínica e objetiva
- Destaque riscos e oportunidades de intervenção
- Sugira ajustes de protocolo quando aplicável
- Referencie o perfil metabólico e a adaptação
- 3-4 frases concisas`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`AI error: ${res.status}`);

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Narrativa fallback determinística (sem IA).
 */
function generateFallbackNarrative(
  projection: DeterministicProjection,
  avgAdherence: number,
  analysis: HistoricalAnalysis,
): { patient: string; professional: string } {
  const d = projection.weight_delta;
  const typeLabels: Record<string, string> = {
    rapid_responder: "resposta rápida inicial",
    slow_responder: "resposta gradual e progressiva",
    plateau_prone: "tendência a períodos de estagnação",
    weight_cycler: "padrão de oscilação",
    stable_transformer: "transformação estável e consistente",
    behavioral_inconsistent: "padrão comportamental variável",
    resistant_metabolism: "metabolismo resistente a mudanças",
    unknown: "padrão ainda em análise",
  };

  const histNote = analysis.has_sufficient_history
    ? ` Seu perfil metabólico indica ${typeLabels[analysis.metabolic_response_type] || typeLabels.unknown}.`
    : "";

  const patient = d < -3
    ? `Mantendo sua consistência atual de ${Math.round(avgAdherence)}% de adesão, a tendência é de redução progressiva.${histNote} ${projection.recommended_strategy}`
    : d < 0
    ? `A projeção indica uma redução gradual e saudável.${histNote} Com adesão de ${Math.round(avgAdherence)}%, o progresso é sustentável. ${projection.recommended_strategy}`
    : `Sua trajetória sugere uma fase de estabilização metabólica.${histNote} ${projection.recommended_strategy}`;

  const professional = `Projeção ${projection.projected_phase} (Δ${d}kg/90d). Perfil: ${analysis.metabolic_response_type}. Confiança: ${Math.round(projection.confidence_score * 100)}%. Risco platô: ${Math.round(projection.plateau_risk * 100)}%. Estratégia: ${projection.recommended_strategy}`;

  return { patient, professional };
}

// ╔═══════════════════════════════════════════════════════════╗
// ║  CAMADA 3 — ORQUESTRAÇÃO + PERSISTÊNCIA EVOLUTIVA         ║
// ║  Coleta dados → Motor calcula → IA narra → DB persiste    ║
// ╚═══════════════════════════════════════════════════════════╝

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── AUTH ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { patient_id, timeframe = "90d", generation_source = "manual", assessment_id, force_override = false, generate_all_timeframes = false } = await req.json();
    const targetPatient = patient_id || user.id;
    const timeframes = generate_all_timeframes ? ["30d", "90d", "180d", "365d"] : [timeframe];

    // ── ROLE CHECK ──
    const { data: userRoles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const roles = (userRoles || []).map((r: any) => r.role);
    const isProfessional = roles.includes("nutritionist") || roles.includes("admin");

    // ── COOLDOWN CHECK ──
    const { data: lastProjection } = await supabase
      .from("body_projection_snapshots")
      .select("id, created_at, locked_until")
      .eq("patient_id", targetPatient)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastProjection) {
      const lockedUntil = lastProjection.locked_until ? new Date(lastProjection.locked_until) : null;
      if (lockedUntil && new Date() < lockedUntil && (!force_override || !isProfessional)) {
        return new Response(JSON.stringify({
          error: "cooldown_active",
          message: "Projeção em período de espera",
          locked_until: lastProjection.locked_until,
          last_generated: lastProjection.created_at,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ═══════════════════════════════════════════════════════
    // FASE 1: COLETA DE DADOS (banco de dados)
    // ═══════════════════════════════════════════════════════

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

    // Merge & deduplicate weight records
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

    const weights = checkins.filter((c: any) => c.weight).map((c: any) => ({ weight: c.weight, date: c.created_at }));
    const currentWeight = weights[0]?.weight || profile?.weight || null;
    const startWeight = weights.length > 1 ? weights[weights.length - 1].weight : currentWeight;
    const weightChange = currentWeight && startWeight ? currentWeight - startWeight : 0;
    const avgAdherence = snapshots.length > 0
      ? snapshots.reduce((sum: number, s: any) => sum + (s.adherence_score || 0), 0) / snapshots.length
      : 50;
    const weeklyRate = weights.length > 1
      ? weightChange / Math.max(1, weights.length / 7)
      : -0.3;

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
      metabolic_response_type: "unknown", // will be updated below
    };

    // ═══════════════════════════════════════════════════════
    // FASE 2: MOTOR DETERMINÍSTICO CALCULA (zero IA)
    // ═══════════════════════════════════════════════════════

    const historicalAnalysis = analyzeWeightHistory(dedupedRecords);
    currentMetrics.metabolic_response_type = historicalAnalysis.metabolic_response_type;

    // Compute projections for all requested timeframes
    const projections: Record<string, DeterministicProjection> = {};
    for (const tf of timeframes) {
      const tfDays = parseInt(tf) || 90;
      if (currentWeight) {
        projections[tf] = computeProjection(currentWeight, tfDays, weeklyRate, historicalAnalysis, avgAdherence, currentBodyFat, height, sex, age);
      }
    }

    // ═══════════════════════════════════════════════════════
    // FASE 3: IA GENERATIVA NARRA (recebe dados prontos)
    // ═══════════════════════════════════════════════════════

    let patientNarrative = "";
    let professionalNarrative = "";

    const primaryProjection = projections["90d"] || Object.values(projections)[0];

    if (primaryProjection && currentWeight) {
      const narrativeInput: NarrativeInput = {
        currentWeight,
        projection: primaryProjection,
        avgAdherence,
        historicalAnalysis,
        patientName: profile?.full_name,
      };

      if (lovableKey && (await isLLMEnabled())) {
        // Generate both narratives in parallel
        const [patientResult, professionalResult] = await Promise.allSettled([
          generatePatientNarrative(narrativeInput, lovableKey),
          isProfessional ? generateProfessionalSummary(narrativeInput, lovableKey) : Promise.resolve(""),
        ]);

        patientNarrative = patientResult.status === "fulfilled" ? patientResult.value : "";
        professionalNarrative = professionalResult.status === "fulfilled" ? professionalResult.value : "";
      }

      // Fallback if AI failed
      if (!patientNarrative || !professionalNarrative) {
        const fallback = generateFallbackNarrative(primaryProjection, avgAdherence, historicalAnalysis);
        if (!patientNarrative) patientNarrative = fallback.patient;
        if (!professionalNarrative) professionalNarrative = fallback.professional;
      }
    }

    // ═══════════════════════════════════════════════════════
    // FASE 4: PERSISTÊNCIA EVOLUTIVA (snapshots imutáveis)
    // ═══════════════════════════════════════════════════════

    const now = new Date();
    const validUntil = new Date(now.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    const lockedUntil = new Date(now.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    const allResults: any[] = [];

    for (const tf of timeframes) {
      const proj = projections[tf];
      if (!proj) continue;

      const projectedMetrics = {
        rendering_profile: renderingProfile,
        adiposity_level: proj.adiposity_level,
        muscularity_level: (proj.visual_state_seed as any).muscularity_level,
        projected_weight: proj.projected_weight,
        projected_bmi: proj.projected_bmi,
        projected_body_fat: proj.projected_body_fat,
        weight_delta: proj.weight_delta,
        confidence_score: proj.confidence_score,
        projected_phase: proj.projected_phase,
        recommended_strategy: proj.recommended_strategy,
        curve_type: proj.curve_type,
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
        narrative: tf === "90d" ? patientNarrative : null,
        confidence_score: proj.confidence_score,
        projected_body_fat: proj.projected_body_fat,
        metabolic_adaptation_index: proj.metabolic_adaptation_index,
        adherence_prediction_score: proj.adherence_prediction_score,
        plateau_risk: proj.plateau_risk,
        visual_state_seed: proj.visual_state_seed,
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
        ...proj,
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

    // ═══════════════════════════════════════════════════════
    // RESPOSTA FINAL
    // ═══════════════════════════════════════════════════════

    return new Response(JSON.stringify({
      success: true,
      engine_version: ENGINE_VERSION,
      architecture: "hybrid_deterministic_ai",
      layers: {
        deterministic: "Motor clínico v" + ENGINE_VERSION + " — cálculos de projeção, confiança, risco",
        generative: lovableKey ? "Lovable AI Gateway — narrativa e interpretação" : "Fallback determinístico",
        persistence: "Snapshots imutáveis com cooldown de " + COOLDOWN_DAYS + " dias",
      },
      snapshots: allResults,
      primary_snapshot_id: allResults.find(r => r.timeframe === "90d")?.snapshot_id || allResults[0]?.snapshot_id,
      generated_at: now.toISOString(),
      valid_until: validUntil.toISOString(),
      locked_until: lockedUntil.toISOString(),
      current_body: currentMetrics,
      narratives: {
        patient: patientNarrative,
        professional: professionalNarrative,
      },
      // Legacy field for backward compatibility
      narrative: patientNarrative,
      timeframes,
      generation_source,
      weight_history_records: dedupedRecords.length,
      historical_analysis: historicalAnalysis,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Body projection error:", error);
    const status = error.message?.includes("ai_429") ? 429
      : error.message?.includes("ai_402") ? 402
      : 500;
    return new Response(JSON.stringify({ error: error.message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
