/**
 * Coach Bodybuilder — IFJ Analysis Engine v2 & Decision Engine v2
 * 
 * Composite scoring, alert generation, expanded phases, and
 * context-aware decision suggestions.
 */

export interface CheckinData {
  id?: string;
  checkin_date: string;
  weight: number | null;
  weight_avg_7d: number | null;
  weight_variation: number | null;
  adherence_pct: number | null;
  hunger: number | null;
  energy: number | null;
  sleep_quality: number | null;
  pump: number | null;
  libido: number | null;
  retention: number | null;
  digestion: number | null;
  performance: number | null;
  training_load: number | null;
  training_volume: number | null;
  cardio_minutes: number | null;
  steps: number | null;
  front_photo_url?: string | null;
  side_photo_url?: string | null;
  back_photo_url?: string | null;
  visual_observation?: string | null;
  visual_verdict?: string | null;
  notes?: string | null;
}

export interface CompositeScore {
  physical: number;
  adherence: number;
  recovery: number;
  performance: number;
  risk: number;
  overall: number;
}

export interface AnalysisResult {
  plateau_detected: boolean;
  catabolism_risk: "low" | "moderate" | "high";
  water_retention: "normal" | "mild" | "moderate" | "severe";
  evolution_consistency: "consistent" | "irregular" | "declining";
  overall_score: number;
  composite_score: CompositeScore;
  analysis_summary: string;
}

export interface CoachAlert {
  alert_type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
}

export interface DecisionSuggestion {
  decision_type: string;
  reason: string;
  data_basis: string;
  confidence_level: "low" | "medium" | "high";
  expected_impact: string;
}

// ── Phase config ────────────────────────────────────────────

export const PHASE_LABELS: Record<string, string> = {
  off_season: "Off Season",
  bulking: "Bulking",
  cutting: "Cutting",
  pre_contest: "Pré Contest",
  peak_week: "Peak Week",
  reverse: "Reverse Diet",
  maintenance: "Manutenção",
};

export const PHASE_LIST = Object.keys(PHASE_LABELS);

// ── Analysis Engine v2 ─────────────────────────────────────

export function analyzeAthleteData(
  checkins: CheckinData[],
  phase: string
): AnalysisResult {
  const empty: CompositeScore = { physical: 50, adherence: 50, recovery: 50, performance: 50, risk: 50, overall: 50 };

  if (checkins.length === 0) {
    return {
      plateau_detected: false,
      catabolism_risk: "low",
      water_retention: "normal",
      evolution_consistency: "consistent",
      overall_score: 50,
      composite_score: empty,
      analysis_summary: "Dados insuficientes para análise. Registre check-ins para ativar o motor.",
    };
  }

  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const recent = sorted.slice(-7);

  // Plateau detection
  const weights = recent.map(c => c.weight).filter((w): w is number => w != null);
  const plateau_detected = weights.length >= 3 &&
    Math.abs((weights[weights.length - 1] - weights[0])) < 0.3;

  // Catabolism risk
  const avgEnergy = avg(recent.map(c => c.energy));
  const avgPerf = avg(recent.map(c => c.performance));
  const avgPump = avg(recent.map(c => c.pump));
  const avgLibido = avg(recent.map(c => c.libido));
  const catabolismScore = ((10 - avgEnergy) + (10 - avgPerf) + (10 - avgPump) + (10 - avgLibido)) / 4;
  const catabolism_risk: AnalysisResult["catabolism_risk"] =
    catabolismScore > 5 ? "high" : catabolismScore > 3 ? "moderate" : "low";

  // Water retention
  const avgRetention = avg(recent.map(c => c.retention));
  const water_retention: AnalysisResult["water_retention"] =
    avgRetention >= 8 ? "severe" : avgRetention >= 6 ? "moderate" : avgRetention >= 4 ? "mild" : "normal";

  // Evolution consistency
  const variations = recent.map(c => c.weight_variation).filter((v): v is number => v != null);
  const avgVariation = variations.length > 0 ? variations.reduce((a, b) => a + Math.abs(b), 0) / variations.length : 0;
  const evolution_consistency: AnalysisResult["evolution_consistency"] =
    avgVariation > 1.5 ? "declining" : avgVariation > 0.8 ? "irregular" : "consistent";

  // ── Composite Scores ──────────────────────────────────────

  // Physical: weight trend + body composition signals
  const weightDelta = weights.length >= 2 ? weights[weights.length - 1] - weights[0] : 0;
  const isWeightGoalMet = (phase === "cutting" && weightDelta <= 0) || (phase === "bulking" && weightDelta >= 0) || (phase !== "cutting" && phase !== "bulking");
  let physical = 50;
  if (isWeightGoalMet) physical += 20;
  if (!plateau_detected) physical += 15;
  if (evolution_consistency === "consistent") physical += 15;
  else if (evolution_consistency === "irregular") physical += 5;

  // Adherence
  const avgAdherence = avg(recent.map(c => c.adherence_pct));
  let adherence = Math.min(100, Math.max(0, avgAdherence));

  // Recovery: sleep, digestion, libido, hunger
  const avgSleep = avg(recent.map(c => c.sleep_quality));
  const avgDigestion = avg(recent.map(c => c.digestion));
  const avgHunger = avg(recent.map(c => c.hunger));
  let recovery = ((avgSleep + avgDigestion + avgLibido + (10 - Math.abs(avgHunger - 5))) / 4) * 10;
  recovery = Math.min(100, Math.max(0, recovery));

  // Performance: pump, performance, training load
  const avgLoad = avg(recent.map(c => c.training_load));
  let perf = ((avgPerf + avgPump) / 2) * 10;
  if (avgLoad > 0) perf = Math.min(100, perf + 5);
  perf = Math.min(100, Math.max(0, perf));

  // Risk: inverse of danger signals
  let risk = 100;
  if (catabolism_risk === "high") risk -= 35;
  else if (catabolism_risk === "moderate") risk -= 15;
  if (water_retention === "severe") risk -= 25;
  else if (water_retention === "moderate") risk -= 12;
  if (plateau_detected) risk -= 15;
  if (evolution_consistency === "declining") risk -= 15;
  risk = Math.max(0, Math.min(100, risk));

  const overall = Math.round((physical * 0.25 + adherence * 0.2 + recovery * 0.2 + perf * 0.2 + risk * 0.15));

  const composite_score: CompositeScore = {
    physical: Math.round(physical),
    adherence: Math.round(adherence),
    recovery: Math.round(recovery),
    performance: Math.round(perf),
    risk: Math.round(risk),
    overall,
  };

  // Summary
  const issues: string[] = [];
  if (plateau_detected) issues.push("platô de peso detectado");
  if (catabolism_risk !== "low") issues.push(`risco de catabolismo ${catabolism_risk === "high" ? "alto" : "moderado"}`);
  if (water_retention !== "normal") issues.push(`retenção hídrica ${water_retention === "severe" ? "severa" : water_retention}`);
  if (evolution_consistency !== "consistent") issues.push(`evolução ${evolution_consistency === "declining" ? "em declínio" : "irregular"}`);

  const analysis_summary = issues.length === 0
    ? `Atleta em boa evolução na fase de ${PHASE_LABELS[phase] || phase}. Score: ${overall}/100.`
    : `Atenção: ${issues.join(", ")}. Score: ${overall}/100. Recomenda-se revisão do protocolo.`;

  return {
    plateau_detected,
    catabolism_risk,
    water_retention,
    evolution_consistency,
    overall_score: overall,
    composite_score,
    analysis_summary,
  };
}

// ── Alert Engine ────────────────────────────────────────────

export function generateAlerts(
  analysis: AnalysisResult,
  checkins: CheckinData[],
  phase: string
): CoachAlert[] {
  const alerts: CoachAlert[] = [];
  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const lastCheckin = sorted[sorted.length - 1];

  // Check-in atrasado (> 3 dias)
  if (lastCheckin) {
    const daysSince = Math.floor((Date.now() - new Date(lastCheckin.checkin_date).getTime()) / 86400000);
    if (daysSince > 3) {
      alerts.push({
        alert_type: "checkin_overdue",
        severity: daysSince > 7 ? "critical" : "high",
        title: "Check-in Atrasado",
        description: `Último check-in há ${daysSince} dias.`,
      });
    }
  }

  if (analysis.plateau_detected) {
    alerts.push({
      alert_type: "plateau",
      severity: "high",
      title: "Platô Detectado",
      description: "Peso estagnado nos últimos check-ins. Considerar ajuste de protocolo.",
    });
  }

  if (analysis.water_retention === "severe") {
    alerts.push({
      alert_type: "retention_high",
      severity: "high",
      title: "Retenção Alta",
      description: "Retenção hídrica severa detectada nos marcadores subjetivos.",
    });
  }

  if (analysis.catabolism_risk === "high") {
    alerts.push({
      alert_type: "catabolism_risk",
      severity: "critical",
      title: "Risco de Catabolismo",
      description: "Sinais de catabolismo: energia, pump e performance baixos.",
    });
  }

  // Fadiga acumulada
  const recent = sorted.slice(-5);
  const avgEnergy = avg(recent.map(c => c.energy));
  const avgSleep = avg(recent.map(c => c.sleep_quality));
  if (avgEnergy <= 4 && avgSleep <= 4) {
    alerts.push({
      alert_type: "fatigue",
      severity: "high",
      title: "Fadiga Acumulada",
      description: "Energia e sono consistentemente baixos. Considerar deload.",
    });
  }

  // Baixa adesão
  const avgAdh = avg(recent.map(c => c.adherence_pct));
  if (avgAdh < 60) {
    alerts.push({
      alert_type: "low_adherence",
      severity: avgAdh < 40 ? "critical" : "high",
      title: "Baixa Adesão",
      description: `Aderência média em ${Math.round(avgAdh)}%. Revisar protocolo.`,
    });
  }

  // Queda de performance
  const avgPerf = avg(recent.map(c => c.performance));
  if (avgPerf <= 4) {
    alerts.push({
      alert_type: "performance_drop",
      severity: "medium",
      title: "Queda de Performance",
      description: "Performance média baixa nos últimos check-ins.",
    });
  }

  if (analysis.evolution_consistency === "declining") {
    alerts.push({
      alert_type: "inconsistent_evolution",
      severity: "high",
      title: "Evolução Inconsistente",
      description: "Tendência de evolução em declínio. Revisar estratégia.",
    });
  }

  return alerts;
}

// ── Decision Engine v2 ──────────────────────────────────────

export function generateDecisions(
  analysis: AnalysisResult,
  phase: string,
  checkins: CheckinData[]
): DecisionSuggestion[] {
  const decisions: DecisionSuggestion[] = [];
  const recent = checkins.slice(-7);
  const isCutPhase = ["cutting", "pre_contest", "peak_week"].includes(phase);
  const isBulkPhase = ["bulking", "off_season"].includes(phase);

  if (analysis.plateau_detected && isCutPhase) {
    decisions.push({
      decision_type: "reduce_carbs",
      reason: "Platô de peso detectado em fase de déficit. Reduzir carboidrato pode quebrar a estagnação.",
      data_basis: `Peso estável nos últimos ${recent.length} check-ins.`,
      confidence_level: "high",
      expected_impact: "Quebra de platô em 5-7 dias com deficit ajustado.",
    });
    decisions.push({
      decision_type: "adjust_cardio_up",
      reason: "Aumento leve de cardio pode auxiliar a quebrar o platô sem comprometer recuperação.",
      data_basis: "Platô detectado com cardio atual insuficiente.",
      confidence_level: "medium",
      expected_impact: "Aumento de gasto calórico semanal em 500-800 kcal.",
    });
  }

  if (analysis.plateau_detected && isBulkPhase) {
    decisions.push({
      decision_type: "increase_carbs",
      reason: "Peso estagnado em bulking. Aumentar carboidrato ou calorias totais pode reativar o ganho.",
      data_basis: "Variação de peso < 0.3kg nos últimos check-ins.",
      confidence_level: "high",
      expected_impact: "Retomada de ganho de 0.2-0.4kg/semana.",
    });
  }

  if (analysis.catabolism_risk === "high") {
    decisions.push({
      decision_type: "reduce_volume",
      reason: "Sinais de catabolismo detectados: energia, performance e pump baixos. Reduzir volume de treino.",
      data_basis: `Média de energia: ${avg(recent.map(c => c.energy)).toFixed(1)}, performance: ${avg(recent.map(c => c.performance)).toFixed(1)}.`,
      confidence_level: "high",
      expected_impact: "Redução do risco de overtraining e preservação muscular.",
    });
    decisions.push({
      decision_type: "increase_carbs",
      reason: "Risco de catabolismo alto. Considerar aumento de carboidrato para preservação muscular.",
      data_basis: "Marcadores subjetivos indicam déficit energético excessivo.",
      confidence_level: "medium",
      expected_impact: "Melhora de energia e pump em 3-5 dias.",
    });
  }

  if (analysis.catabolism_risk === "moderate") {
    decisions.push({
      decision_type: "strategic_refeed",
      reason: "Sinais moderados de fadiga acumulada. Considerar refeed ou dia de refeição livre estratégica.",
      data_basis: "Marcadores de energia e performance abaixo do ideal.",
      confidence_level: "medium",
      expected_impact: "Recarga de glicogênio, melhora hormonal e mental.",
    });
  }

  if (analysis.water_retention === "severe" || analysis.water_retention === "moderate") {
    decisions.push({
      decision_type: "review_sodium_water",
      reason: `Retenção hídrica ${analysis.water_retention === "severe" ? "severa" : "moderada"} detectada. Revisar sódio, água e cardio.`,
      data_basis: `Média de retenção: ${avg(recent.map(c => c.retention)).toFixed(1)}/10.`,
      confidence_level: analysis.water_retention === "severe" ? "high" : "medium",
      expected_impact: "Redução de retenção visível em 3-5 dias com ajuste.",
    });
  }

  if (analysis.evolution_consistency === "declining") {
    decisions.push({
      decision_type: "deload",
      reason: "Evolução em declínio. Considerar semana de deload para recuperação completa.",
      data_basis: "Variação de peso irregular e tendência negativa nos marcadores.",
      confidence_level: "medium",
      expected_impact: "Recuperação completa do SNC e retomada de progressão.",
    });
  }

  // Recovery-specific
  const avgSleep = avg(recent.map(c => c.sleep_quality));
  if (avgSleep <= 4) {
    decisions.push({
      decision_type: "review_recovery",
      reason: "Qualidade de sono consistentemente baixa. Impacta diretamente recuperação e progressão.",
      data_basis: `Sono médio: ${avgSleep.toFixed(1)}/10.`,
      confidence_level: "medium",
      expected_impact: "Melhora de hormônios anabólicos e performance em treino.",
    });
  }

  // Hold protocol suggestion
  const avgAdh = avg(recent.map(c => c.adherence_pct));
  if (analysis.overall_score >= 60 && !analysis.plateau_detected && avgAdh < 85) {
    decisions.push({
      decision_type: "hold_protocol",
      reason: "Protocolo está funcionando mas adesão pode melhorar. Manter por mais 7-10 dias antes de ajustar.",
      data_basis: `Score: ${analysis.overall_score}, aderência: ${Math.round(avgAdh)}%.`,
      confidence_level: "medium",
      expected_impact: "Consolidação de resultados com adesão melhorada.",
    });
  }

  // Phase-specific peak_week
  if (phase === "peak_week") {
    if (analysis.water_retention !== "normal") {
      decisions.push({
        decision_type: "water_manipulation",
        reason: "Peak week com retenção. Iniciar protocolo de manipulação hídrica.",
        data_basis: `Retenção: ${analysis.water_retention}.`,
        confidence_level: "high",
        expected_impact: "Visual seco e vascularizado para o dia do show.",
      });
    }
  }

  if (decisions.length === 0) {
    decisions.push({
      decision_type: "maintain_protocol",
      reason: "Atleta evoluindo bem dentro do esperado. Manter protocolo atual.",
      data_basis: `Score geral: ${analysis.overall_score}/100. Sem alertas críticos.`,
      confidence_level: "high",
      expected_impact: "Continuidade de progressão dentro da fase atual.",
    });
  }

  return decisions;
}

// ── Helpers ─────────────────────────────────────────────────

function avg(values: (number | null | undefined)[]): number {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return 5;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export const DECISION_LABELS: Record<string, string> = {
  maintain_protocol: "Manter Protocolo",
  increase_carbs: "Aumentar Carbo",
  reduce_carbs: "Reduzir Carbo",
  adjust_cardio_up: "Subir Cardio",
  adjust_cardio_down: "Baixar Cardio",
  review_sodium_water: "Revisar Sódio/Água",
  strategic_refeed: "Refeed Estratégico",
  increase_protein: "Aumentar Proteína",
  reduce_volume: "Reduzir Volume",
  deload: "Semana Deload",
  hold_protocol: "Segurar Protocolo",
  review_recovery: "Revisar Recuperação",
  review_meal_distribution: "Revisar Distribuição",
  water_manipulation: "Manipulação Hídrica",
  other: "Outro",
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  checkin_overdue: "Check-in Atrasado",
  plateau: "Platô",
  retention_high: "Retenção Alta",
  catabolism_risk: "Risco de Catabolismo",
  fatigue: "Fadiga Acumulada",
  low_adherence: "Baixa Adesão",
  performance_drop: "Queda de Performance",
  inconsistent_evolution: "Evolução Inconsistente",
};

export const VISUAL_VERDICT_OPTIONS = [
  { value: "improved", label: "Melhorou", color: "text-emerald-400" },
  { value: "maintained", label: "Manteve", color: "text-amber-400" },
  { value: "worsened", label: "Piorou", color: "text-red-400" },
];
