/**
 * Coach Bodybuilder — IFJ Analysis Engine & Decision Engine
 * 
 * Deterministic analysis of athlete check-in data to detect:
 * - plateau
 * - catabolism risk
 * - water retention
 * - evolution consistency
 * 
 * And generate actionable decision suggestions.
 */

export interface CheckinData {
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
}

export interface AnalysisResult {
  plateau_detected: boolean;
  catabolism_risk: "low" | "moderate" | "high";
  water_retention: "normal" | "mild" | "moderate" | "severe";
  evolution_consistency: "consistent" | "irregular" | "declining";
  overall_score: number;
  analysis_summary: string;
}

export interface DecisionSuggestion {
  decision_type: string;
  reason: string;
  data_basis: string;
  confidence_level: "low" | "medium" | "high";
}

// ── Analysis Engine ─────────────────────────────────────────

export function analyzeAthleteData(
  checkins: CheckinData[],
  phase: string
): AnalysisResult {
  if (checkins.length === 0) {
    return {
      plateau_detected: false,
      catabolism_risk: "low",
      water_retention: "normal",
      evolution_consistency: "consistent",
      overall_score: 50,
      analysis_summary: "Dados insuficientes para análise. Registre check-ins para ativar o motor.",
    };
  }

  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const recent = sorted.slice(-7);

  // Plateau detection: weight variation < 0.3kg over last 7 entries
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

  // Overall score (0-100)
  let score = 70;
  if (plateau_detected) score -= 15;
  if (catabolism_risk === "high") score -= 20;
  else if (catabolism_risk === "moderate") score -= 10;
  if (water_retention === "severe") score -= 15;
  else if (water_retention === "moderate") score -= 8;
  if (evolution_consistency === "declining") score -= 15;
  else if (evolution_consistency === "irregular") score -= 8;
  
  const avgAdherence = avg(recent.map(c => c.adherence_pct));
  if (avgAdherence >= 90) score += 10;
  else if (avgAdherence >= 70) score += 5;
  else if (avgAdherence < 50) score -= 10;

  score = Math.max(0, Math.min(100, score));

  // Summary
  const issues: string[] = [];
  if (plateau_detected) issues.push("platô de peso detectado");
  if (catabolism_risk !== "low") issues.push(`risco de catabolismo ${catabolism_risk === "high" ? "alto" : "moderado"}`);
  if (water_retention !== "normal") issues.push(`retenção hídrica ${water_retention === "severe" ? "severa" : water_retention}`);
  if (evolution_consistency !== "consistent") issues.push(`evolução ${evolution_consistency === "declining" ? "em declínio" : "irregular"}`);

  const analysis_summary = issues.length === 0
    ? `Atleta em boa evolução na fase de ${phaseLabel(phase)}. Score: ${score}/100.`
    : `Atenção: ${issues.join(", ")}. Score: ${score}/100. Recomenda-se revisão do protocolo.`;

  return { plateau_detected, catabolism_risk, water_retention, evolution_consistency, overall_score: score, analysis_summary };
}

// ── Decision Engine ─────────────────────────────────────────

export function generateDecisions(
  analysis: AnalysisResult,
  phase: string,
  checkins: CheckinData[]
): DecisionSuggestion[] {
  const decisions: DecisionSuggestion[] = [];
  const recent = checkins.slice(-7);

  if (analysis.plateau_detected && phase === "cutting") {
    decisions.push({
      decision_type: "reduce_carbs",
      reason: "Platô de peso detectado em fase de cutting. Reduzir carboidrato pode quebrar a estagnação.",
      data_basis: `Peso estável nos últimos ${recent.length} check-ins.`,
      confidence_level: "high",
    });
    decisions.push({
      decision_type: "adjust_cardio",
      reason: "Aumento leve de cardio pode auxiliar a quebrar o platô sem comprometer recuperação.",
      data_basis: "Platô detectado com cardio atual insuficiente.",
      confidence_level: "medium",
    });
  }

  if (analysis.plateau_detected && phase === "bulking") {
    decisions.push({
      decision_type: "increase_carbs",
      reason: "Peso estagnado em bulking. Aumentar carboidrato ou calorias totais pode reativar o ganho.",
      data_basis: `Variação de peso < 0.3kg nos últimos check-ins.`,
      confidence_level: "high",
    });
  }

  if (analysis.catabolism_risk === "high") {
    decisions.push({
      decision_type: "reduce_volume",
      reason: "Sinais de catabolismo detectados: energia, performance e pump baixos. Reduzir volume de treino.",
      data_basis: `Média de energia: ${avg(recent.map(c => c.energy)).toFixed(1)}, performance: ${avg(recent.map(c => c.performance)).toFixed(1)}.`,
      confidence_level: "high",
    });
    decisions.push({
      decision_type: "increase_carbs",
      reason: "Risco de catabolismo alto. Considerar aumento de carboidrato para preservação muscular.",
      data_basis: "Marcadores subjetivos indicam déficit energético excessivo.",
      confidence_level: "medium",
    });
  }

  if (analysis.catabolism_risk === "moderate") {
    decisions.push({
      decision_type: "review_refeed",
      reason: "Sinais moderados de fadiga acumulada. Considerar refeed ou dia de refeição livre.",
      data_basis: "Marcadores de energia e performance abaixo do ideal.",
      confidence_level: "medium",
    });
  }

  if (analysis.water_retention === "severe" || analysis.water_retention === "moderate") {
    decisions.push({
      decision_type: "adjust_cardio",
      reason: `Retenção hídrica ${analysis.water_retention === "severe" ? "severa" : "moderada"} detectada. Revisar sódio, água e cardio.`,
      data_basis: `Média de retenção: ${avg(recent.map(c => c.retention)).toFixed(1)}/10.`,
      confidence_level: analysis.water_retention === "severe" ? "high" : "medium",
    });
  }

  if (analysis.evolution_consistency === "declining") {
    decisions.push({
      decision_type: "deload",
      reason: "Evolução em declínio. Considerar semana de deload para recuperação completa.",
      data_basis: "Variação de peso irregular e tendência negativa nos marcadores.",
      confidence_level: "medium",
    });
  }

  if (decisions.length === 0) {
    decisions.push({
      decision_type: "maintain_protocol",
      reason: "Atleta evoluindo bem dentro do esperado. Manter protocolo atual.",
      data_basis: `Score geral: ${analysis.overall_score}/100. Sem alertas críticos.`,
      confidence_level: "high",
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

function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    cutting: "Cutting",
    bulking: "Bulking",
    peak_week: "Peak Week",
    reverse: "Reverse Diet",
    maintenance: "Manutenção",
  };
  return map[phase] || phase;
}
