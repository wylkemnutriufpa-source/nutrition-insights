/**
 * ═══════════════════════════════════════════════════════════
 * FITJOURNEY BODY PROJECTION ENGINE v2.0.0
 * ═══════════════════════════════════════════════════════════
 * 
 * CAMADA 1 — Motor Determinístico Clínico (Core do Sistema)
 * 
 * Este serviço é responsável por TODOS os cálculos de projeção.
 * A IA generativa NUNCA calcula — ela apenas visualiza e narra.
 * 
 * Fórmula central:
 *   peso_futuro = peso_atual - (déficit_calórico_real × aderência × adaptação_metabólica)
 * 
 * ═══════════════════════════════════════════════════════════
 */

import { WEIGHT_LOSS_LIMITS, CALORIC_DEFICIT_LIMITS, DETECTION_WINDOWS, CONFIDENCE_THRESHOLDS } from "@/lib/clinicalConstitution";

// ── TYPES ───────────────────────────────────────────────────

export interface WeightRecord {
  weight: number;
  date: string;
  body_fat_percentage?: number | null;
}

export interface HistoricalAnalysis {
  metabolic_response_type: MetabolicResponseType;
  historical_loss_rate: number;       // kg/semana
  regain_probability: number;         // 0-1
  plateau_probability: number;        // 0-1
  behavioral_consistency_score: number; // 0-1
  yoyo_cycles: number;
  longest_plateau_weeks: number;
  total_history_weeks: number;
  net_change_kg: number;
  has_sufficient_history: boolean;
}

export type MetabolicResponseType =
  | "rapid_responder"
  | "stable_transformer"
  | "slow_responder"
  | "plateau_prone"
  | "weight_cycler"
  | "behavioral_inconsistent"
  | "resistant_metabolism"
  | "unknown";

export interface ProjectionInput {
  currentWeight: number;
  currentBodyFat?: number | null;
  height: number;                     // cm
  sex: "male" | "female" | "neutral";
  age?: number;
  weightHistory: WeightRecord[];
  checkins: { weight: number; date: string; adherence_score?: number }[];
  avgAdherence: number;               // 0-100
  activeProtocol?: {
    caloric_target?: number;
    deficit_percent?: number;
    goal_category?: string;
  };
  metabolicTwin?: {
    energy_efficiency_index?: number;
    adaptive_resistance_index?: number;
    metabolic_flexibility?: number;
  };
}

export interface ProjectionHorizon {
  timeframe: string;                  // "30d", "90d", "180d", "365d"
  days: number;
  projected_weight: number;
  projected_body_fat: number | null;
  projected_bmi: number;
  weight_delta: number;
  metabolic_adaptation_index: number;
  adherence_prediction_score: number;
  plateau_risk: number;
  projected_phase: string;
  recommended_strategy: string;
  confidence_score: number;
  curve_type: string;
  visual_state_seed: VisualStateSeed;
}

export interface VisualStateSeed {
  rendering_profile: "male" | "female" | "neutral";
  adiposity_level: "very_high" | "high" | "moderate" | "low" | "very_low";
  muscularity_level: "very_low" | "low" | "moderate" | "moderate_to_high" | "high";
  body_frame_type: "small" | "medium" | "large";
  silhouette_class: string;
  glow_intensity: number;           // 0-1 (for holographic rendering)
  transformation_magnitude: number; // 0-1
}

export interface FullProjectionResult {
  historicalAnalysis: HistoricalAnalysis;
  currentMetrics: {
    weight: number;
    bmi: number;
    body_fat: number | null;
    adiposity_level: string;
    clinical_phase: string;
    rendering_profile: string;
  };
  horizons: ProjectionHorizon[];
  engineVersion: string;
}

// ── CONSTANTS ───────────────────────────────────────────────

const ENGINE_VERSION = "2.0.0";

const METABOLIC_ADAPTATION_RATES: Record<string, number> = {
  rapid_responder: 0.03,     // 3% adaptation per month
  stable_transformer: 0.02,
  slow_responder: 0.015,
  plateau_prone: 0.04,
  weight_cycler: 0.035,
  behavioral_inconsistent: 0.02,
  resistant_metabolism: 0.05,
  unknown: 0.025,
};

// ── HISTORICAL ANALYSIS ─────────────────────────────────────

export function analyzeWeightHistory(records: WeightRecord[]): HistoricalAnalysis {
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

  // Detect yoyo cycles
  let yoyoCycles = 0;
  let direction = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i].weight - sorted[i - 1].weight;
    const newDir = diff < -0.3 ? -1 : diff > 0.3 ? 1 : 0;
    if (newDir !== 0 && direction !== 0 && newDir !== direction) yoyoCycles++;
    if (newDir !== 0) direction = newDir;
  }

  // Detect plateaus
  let longestPlateau = 0, currentPlateau = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].weight - sorted[i - 1].weight) < DETECTION_WINDOWS.PLATEAU_TOLERANCE_KG) {
      currentPlateau++;
      longestPlateau = Math.max(longestPlateau, currentPlateau);
    } else {
      currentPlateau = 0;
    }
  }
  const avgSpacingWeeks = totalWeeks / Math.max(1, sorted.length - 1);
  const longestPlateauWeeks = Math.round(longestPlateau * avgSpacingWeeks);

  // Detect regain events
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

  // Consistency score (inverse of variance)
  const weeklyChanges: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const weeks = (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / (7 * 24 * 60 * 60 * 1000);
    if (weeks > 0) weeklyChanges.push((sorted[i].weight - sorted[i - 1].weight) / weeks);
  }
  const mean = weeklyChanges.reduce((a, b) => a + b, 0) / Math.max(1, weeklyChanges.length);
  const variance = weeklyChanges.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, weeklyChanges.length);
  const consistencyScore = Math.max(0, Math.min(1, 1 - Math.sqrt(variance) / 2));

  // Classify metabolic response
  const hasSufficient = totalWeeks >= 4 && sorted.length >= 4;
  let responseType: MetabolicResponseType = "unknown";

  if (hasSufficient) {
    if (consistencyScore < 0.35 && Math.sqrt(variance) > 1.0) {
      responseType = "behavioral_inconsistent";
    } else if (yoyoCycles >= 3 || regainEvents >= 2) {
      responseType = "weight_cycler";
    } else if (longestPlateauWeeks >= DETECTION_WINDOWS.PLATEAU_MIN_WEEKS || (longestPlateau / Math.max(1, sorted.length)) > 0.4) {
      responseType = "plateau_prone";
    } else if (avgWeeklyRate < -0.7) {
      responseType = "rapid_responder";
    } else if (avgWeeklyRate <= -0.15 && consistencyScore >= 0.6 && yoyoCycles <= 1) {
      responseType = "stable_transformer";
    } else if (avgWeeklyRate < -0.05) {
      responseType = "slow_responder";
    } else if (Math.abs(avgWeeklyRate) <= 0.15 && consistencyScore > 0.7) {
      responseType = "stable_transformer";
    } else {
      responseType = "slow_responder";
    }
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

// ── PROJECTION COMPUTATION ──────────────────────────────────

/**
 * Computes multi-horizon body projection using deterministic clinical formulas.
 * 
 * Core formula:
 *   projected_weight = current_weight - (effective_rate × weeks × adherence_factor × metabolic_adaptation)
 * 
 * The AI layer NEVER touches this. It only receives the output for visualization.
 */
export function computeFullProjection(input: ProjectionInput): FullProjectionResult {
  // Merge weight records
  const allRecords: WeightRecord[] = [
    ...input.weightHistory,
    ...input.checkins.filter(c => c.weight).map(c => ({ weight: c.weight, date: c.date, body_fat_percentage: null })),
  ];
  const seen = new Set<string>();
  const deduped = allRecords.filter(r => {
    const key = r.date.substring(0, 10);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const historicalAnalysis = analyzeWeightHistory(deduped);

  // Current metrics
  const bmi = input.currentWeight / ((input.height / 100) ** 2);
  const adiposityLevel = classifyAdiposity(bmi);
  const renderingProfile = input.sex === "female" ? "female" : input.sex === "male" ? "male" : "neutral";

  const recentWeights = input.checkins.filter(c => c.weight).map(c => c.weight);
  const weeklyRate = recentWeights.length > 1
    ? (recentWeights[0] - recentWeights[recentWeights.length - 1]) / Math.max(1, recentWeights.length / 7)
    : historicalAnalysis.historical_loss_rate;

  const clinicalPhase = weeklyRate < -0.5 ? "perda_ativa"
    : weeklyRate < -0.1 ? "reducao_gradual"
    : weeklyRate < 0.1 ? "estabilizacao"
    : "recomposicao";

  // Generate all horizons
  const timeframes = [
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "180d", days: 180 },
    { label: "365d", days: 365 },
  ];

  const horizons = timeframes.map(tf => computeHorizon(
    input, tf.label, tf.days, weeklyRate, historicalAnalysis, renderingProfile, bmi
  ));

  return {
    historicalAnalysis,
    currentMetrics: {
      weight: input.currentWeight,
      bmi: Math.round(bmi * 10) / 10,
      body_fat: input.currentBodyFat || null,
      adiposity_level: adiposityLevel,
      clinical_phase: clinicalPhase,
      rendering_profile: renderingProfile,
    },
    horizons,
    engineVersion: ENGINE_VERSION,
  };
}

function computeHorizon(
  input: ProjectionInput,
  timeframe: string,
  days: number,
  weeklyRate: number,
  analysis: HistoricalAnalysis,
  renderingProfile: "male" | "female" | "neutral",
  currentBmi: number,
): ProjectionHorizon {
  const weeks = days / 7;

  // Blend checkin rate with historical rate
  let effectiveRate = weeklyRate;
  if (analysis.has_sufficient_history) {
    effectiveRate = weeklyRate * 0.4 + analysis.historical_loss_rate * 0.6;
  }

  // Apply adherence factor (0-1 from 0-100%)
  const adherenceFactor = Math.max(0.3, input.avgAdherence / 100);

  // Metabolic adaptation: slows progress over time
  const adaptationRate = METABOLIC_ADAPTATION_RATES[analysis.metabolic_response_type] || 0.025;
  const months = days / 30;
  const metabolicAdaptation = Math.max(0.6, 1 - adaptationRate * months);

  // Incorporate metabolic twin if available
  let twinFactor = 1.0;
  if (input.metabolicTwin) {
    const efficiency = input.metabolicTwin.energy_efficiency_index || 1.0;
    const resistance = input.metabolicTwin.adaptive_resistance_index || 0;
    twinFactor = efficiency * (1 - resistance * 0.3);
  }

  // Core formula
  let rawProjection = input.currentWeight + (effectiveRate * weeks * adherenceFactor * metabolicAdaptation * twinFactor);

  // Apply metabolic-type penalties
  let plateauPenalty = 0, regainPenalty = 0, curveType = "linear";

  switch (analysis.metabolic_response_type) {
    case "weight_cycler":
      regainPenalty = Math.abs(effectiveRate * weeks) * 0.4 * analysis.regain_probability;
      curveType = "oscillating";
      break;
    case "plateau_prone":
      plateauPenalty = Math.abs(effectiveRate * weeks) * 0.3 * analysis.plateau_probability;
      curveType = "stepped";
      break;
    case "rapid_responder":
      if (weeks > 12) plateauPenalty = Math.abs(effectiveRate * (weeks - 12)) * 0.2;
      curveType = "decelerating";
      break;
    case "slow_responder":
      curveType = "gradual";
      break;
    case "stable_transformer":
      curveType = "progressive";
      break;
    case "behavioral_inconsistent":
      regainPenalty = Math.abs(effectiveRate * weeks) * 0.35;
      curveType = "erratic";
      break;
    case "resistant_metabolism":
      plateauPenalty = Math.abs(effectiveRate * weeks) * 0.4;
      curveType = "flat";
      break;
  }

  if (effectiveRate < 0) {
    rawProjection += plateauPenalty + regainPenalty;
  } else {
    rawProjection -= plateauPenalty + regainPenalty;
  }

  // Safety guardrails from constitution
  const maxWeeklyLoss = WEIGHT_LOSS_LIMITS.MAX_WEEKLY_LOSS_KG;
  const maxLoss = maxWeeklyLoss * weeks;
  const projectedWeight = Math.round(Math.max(rawProjection, input.currentWeight - maxLoss, input.currentWeight * 0.7) * 10) / 10;

  // Body fat projection
  const currentFat = input.currentBodyFat || estimateBodyFat(currentBmi, input.sex, input.age);
  const weightDelta = projectedWeight - input.currentWeight;
  const fatLossRatio = weightDelta < 0 ? 0.75 : 0.4; // Most weight loss is fat
  const projectedFat = currentFat !== null
    ? Math.round(Math.max(5, currentFat + (weightDelta * fatLossRatio / input.currentWeight * 100)) * 10) / 10
    : null;

  // BMI
  const projectedBmi = projectedWeight / ((input.height / 100) ** 2);
  const projectedAdiposity = classifyAdiposity(projectedBmi);

  // Plateau risk (0-1)
  const plateauRisk = Math.min(1, Math.round((
    analysis.plateau_probability * 0.4 +
    (days > 90 ? 0.15 : 0) +
    (analysis.metabolic_response_type === "plateau_prone" ? 0.25 : 0) +
    (metabolicAdaptation < 0.85 ? 0.15 : 0)
  ) * 100) / 100);

  // Adherence prediction (decay over time)
  const adherencePrediction = Math.round(Math.max(20, input.avgAdherence * (1 - days / 1000)) * 10) / 10;

  // Confidence score
  let confidence = 0.4;
  if (analysis.has_sufficient_history) confidence += 0.15;
  confidence += analysis.behavioral_consistency_score * 0.2;
  confidence += Math.min(0.15, input.avgAdherence / 500);
  if (analysis.metabolic_response_type === "stable_transformer") confidence += 0.08;
  if (analysis.metabolic_response_type === "weight_cycler") confidence -= 0.1;
  if (analysis.metabolic_response_type === "behavioral_inconsistent") confidence -= 0.1;
  // Longer timeframes = less confidence
  confidence -= days / 2000;
  confidence = Math.round(Math.min(0.92, Math.max(0.15, confidence)) * 100) / 100;

  // Phase determination
  const delta = projectedWeight - input.currentWeight;
  const projectedPhase = delta < -3 ? "perda_ativa"
    : delta < -1 ? "reducao_gradual"
    : delta > 1 ? "recomposicao"
    : "consolidacao_metabolica";

  // Strategy based on metabolic type
  const strategy = getStrategyForType(analysis.metabolic_response_type, projectedPhase);

  // Muscularity level estimation
  const muscLevel = input.avgAdherence > 80 ? "moderate_to_high"
    : input.avgAdherence > 60 ? "moderate"
    : input.avgAdherence > 40 ? "low"
    : "very_low";

  // Transformation magnitude for holographic intensity
  const transformMagnitude = Math.min(1, Math.abs(delta) / 15);

  const visualSeed: VisualStateSeed = {
    rendering_profile: renderingProfile,
    adiposity_level: projectedAdiposity,
    muscularity_level: muscLevel,
    body_frame_type: "medium",
    silhouette_class: `${projectedAdiposity}_${muscLevel}`,
    glow_intensity: confidence,
    transformation_magnitude: transformMagnitude,
  };

  return {
    timeframe,
    days,
    projected_weight: projectedWeight,
    projected_body_fat: projectedFat,
    projected_bmi: Math.round(projectedBmi * 10) / 10,
    weight_delta: Math.round(delta * 10) / 10,
    metabolic_adaptation_index: Math.round(metabolicAdaptation * 1000) / 1000,
    adherence_prediction_score: adherencePrediction,
    plateau_risk: plateauRisk,
    projected_phase: projectedPhase,
    recommended_strategy: strategy,
    confidence_score: confidence,
    curve_type: curveType,
    visual_state_seed: visualSeed,
  };
}

// ── HELPERS ─────────────────────────────────────────────────

function classifyAdiposity(bmi: number): "very_high" | "high" | "moderate" | "low" | "very_low" {
  if (bmi > 35) return "very_high";
  if (bmi > 30) return "high";
  if (bmi > 25) return "moderate";
  if (bmi > 22) return "low";
  return "very_low";
}

function estimateBodyFat(bmi: number, sex: string, age?: number): number | null {
  if (!age) return null;
  // Deurenberg formula approximation
  if (sex === "female") {
    return Math.round((1.20 * bmi + 0.23 * age - 5.4) * 10) / 10;
  }
  return Math.round((1.20 * bmi + 0.23 * age - 16.2) * 10) / 10;
}

function getStrategyForType(type: MetabolicResponseType, phase: string): string {
  const strategies: Record<MetabolicResponseType, string> = {
    weight_cycler: "Priorizar fase de consolidação longa para quebrar o ciclo de recuperação. Déficit moderado com transições graduais.",
    plateau_prone: "Implementar variações calóricas periódicas (refeed) para evitar estagnação. Monitorar marcadores metabólicos.",
    rapid_responder: "Aproveitar resposta inicial, mas planejar transição precoce para manutenção. Evitar déficit prolongado.",
    slow_responder: "Manter consistência a longo prazo. Ajustes calóricos pequenos e frequentes. Paciência é o principal aliado.",
    stable_transformer: "Manter protocolo atual. Metabolismo respondendo de forma equilibrada. Priorizar qualidade nutricional.",
    behavioral_inconsistent: "Foco em estabilização de hábitos antes de ajustes calóricos. Simplificar plano e aumentar check-ins.",
    resistant_metabolism: "Considerar ciclos calóricos ou investigação metabólica complementar. Avaliar sono e estresse.",
    unknown: "Continuar acompanhamento para acumular dados suficientes para personalização avançada.",
  };
  return strategies[type] || strategies.unknown;
}

// ── PROJECTION VS ACTUAL COMPARISON ─────────────────────────

export interface ProjectionAccuracy {
  snapshotId: string;
  timeframe: string;
  projectedWeight: number;
  actualWeight: number;
  delta: number;
  accuracyPercent: number;
  verdict: "elite_match" | "achieved" | "close" | "missed";
}

export function evaluateAccuracy(
  projected: number,
  actual: number,
): { accuracyPercent: number; verdict: "elite_match" | "achieved" | "close" | "missed" } {
  const delta = Math.abs(actual - projected);
  const accuracyPercent = Math.max(0, Math.min(100, 100 - delta * 10));

  const verdict = accuracyPercent >= 90 ? "elite_match"
    : accuracyPercent >= 70 ? "achieved"
    : accuracyPercent >= 50 ? "close"
    : "missed";

  return { accuracyPercent: Math.round(accuracyPercent), verdict };
}
