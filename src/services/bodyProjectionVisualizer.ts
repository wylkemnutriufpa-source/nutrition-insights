/**
 * ═══════════════════════════════════════════════════════════
 * FITJOURNEY BODY PROJECTION VISUALIZER v2.0.0
 * ═══════════════════════════════════════════════════════════
 * 
 * CAMADA 2 — IA Generativa (Visual + Narrativa)
 * 
 * Este serviço é responsável APENAS por:
 *   • Gerar representação holográfica visual baseada no snapshot
 *   • Gerar narrativa motivacional personalizada
 *   • Gerar assets visuais (dashboard, stories, slides)
 * 
 * A IA NÃO calcula projeções. Ela EXPLICA e MOSTRA.
 * O motor determinístico (bodyProjectionEngine) CALCULA e DECIDE.
 * 
 * ═══════════════════════════════════════════════════════════
 */

import type { VisualStateSeed, ProjectionHorizon, HistoricalAnalysis } from "./bodyProjectionEngine";

// ── TYPES ───────────────────────────────────────────────────

export interface NarrativeRequest {
  currentWeight: number;
  projectedWeight: number;
  timeframeDays: number;
  currentBmi: number;
  projectedBmi: number;
  avgAdherence: number;
  clinicalPhase: string;
  projectedPhase: string;
  metabolicType: string;
  historicalAnalysis: HistoricalAnalysis;
  strategy: string;
}

export interface VisualAsset {
  type: "hologram" | "story_slide" | "comparison_card" | "timeline_marker";
  seed: VisualStateSeed;
  metadata: Record<string, unknown>;
}

// ── NARRATIVE GENERATION ────────────────────────────────────

/**
 * Generates a deterministic fallback narrative when AI is unavailable.
 * The AI narrative is generated server-side via edge function.
 */
export function generateFallbackNarrative(req: NarrativeRequest): string {
  const delta = req.projectedWeight - req.currentWeight;
  const typeLabels: Record<string, string> = {
    rapid_responder: "resposta rápida inicial",
    slow_responder: "resposta gradual e progressiva",
    plateau_prone: "tendência a períodos de estagnação",
    weight_cycler: "padrão de oscilação (efeito sanfona)",
    stable_transformer: "transformação estável e consistente",
    behavioral_inconsistent: "padrão comportamental variável",
    resistant_metabolism: "metabolismo resistente a mudanças",
    unknown: "padrão ainda em análise",
  };

  const histNote = req.historicalAnalysis.has_sufficient_history
    ? ` Seu perfil metabólico indica ${typeLabels[req.metabolicType] || typeLabels.unknown}.`
    : "";

  if (delta < -3) {
    return `Mantendo sua consistência atual de ${Math.round(req.avgAdherence)}% de adesão, a tendência é de redução progressiva nos próximos ${req.timeframeDays} dias.${histNote} ${req.strategy}`;
  } else if (delta < 0) {
    return `A projeção indica uma redução gradual e saudável.${histNote} Com adesão de ${Math.round(req.avgAdherence)}%, o progresso é sustentável. ${req.strategy}`;
  } else {
    return `Sua trajetória sugere uma fase de estabilização metabólica.${histNote} ${req.strategy}`;
  }
}

// ── VISUAL SEED INTERPRETATION ──────────────────────────────

/**
 * Interprets the visual_state_seed from the engine to configure
 * the holographic rendering parameters. This is the bridge between
 * the deterministic engine and the visual AI layer.
 */
export function interpretVisualSeed(seed: VisualStateSeed): {
  scale: number;
  glowColor: string;
  glowIntensity: number;
  particleDensity: number;
  animationSpeed: number;
  silhouetteVariant: string;
} {
  const scaleMap: Record<string, number> = {
    very_high: 1.25,
    high: 1.15,
    moderate: 1.05,
    low: 0.95,
    very_low: 0.88,
  };

  const glowColorMap: Record<string, string> = {
    very_high: "rgba(239, 68, 68, 0.3)",
    high: "rgba(251, 146, 60, 0.3)",
    moderate: "rgba(250, 204, 21, 0.3)",
    low: "rgba(74, 222, 128, 0.4)",
    very_low: "rgba(34, 197, 94, 0.5)",
  };

  return {
    scale: scaleMap[seed.adiposity_level] || 1.0,
    glowColor: glowColorMap[seed.adiposity_level] || "rgba(100, 200, 255, 0.3)",
    glowIntensity: seed.glow_intensity,
    particleDensity: seed.transformation_magnitude * 20 + 5,
    animationSpeed: 1 + seed.transformation_magnitude * 0.5,
    silhouetteVariant: seed.silhouette_class,
  };
}

// ── STORY/SHARE ASSET GENERATION ────────────────────────────

/**
 * Prepares data for story/slide generation.
 * The actual AI rendering happens server-side.
 */
export function prepareStoryData(
  horizon: ProjectionHorizon,
  currentWeight: number,
  patientName?: string,
): {
  headline: string;
  subheadline: string;
  stats: { label: string; value: string; highlight: boolean }[];
  emotionalTone: "celebratory" | "motivational" | "cautious" | "neutral";
} {
  const delta = horizon.weight_delta;
  const emotionalTone = delta < -5 ? "celebratory"
    : delta < -1 ? "motivational"
    : delta > 1 ? "cautious"
    : "neutral";

  const headline = delta < -3
    ? `${patientName || "Você"}, sua transformação está acontecendo! 🔥`
    : delta < 0
    ? `Progresso consistente em andamento 💪`
    : `Fase de consolidação metabólica 🧬`;

  const subheadline = `Projeção para ${horizon.days} dias baseada em seu perfil metabólico único`;

  const stats = [
    { label: "Peso Projetado", value: `${horizon.projected_weight}kg`, highlight: delta < 0 },
    { label: "Variação", value: `${delta > 0 ? "+" : ""}${delta}kg`, highlight: Math.abs(delta) > 2 },
    { label: "Confiança", value: `${Math.round(horizon.confidence_score * 100)}%`, highlight: horizon.confidence_score > 0.7 },
    { label: "Risco de Platô", value: `${Math.round(horizon.plateau_risk * 100)}%`, highlight: horizon.plateau_risk > 0.5 },
  ];

  if (horizon.projected_body_fat !== null) {
    stats.push({ label: "% Gordura Proj.", value: `${horizon.projected_body_fat}%`, highlight: false });
  }

  return { headline, subheadline, stats, emotionalTone };
}

// ── DISCLAIMER ──────────────────────────────────────────────

export const PROJECTION_DISCLAIMER = {
  short: "Estimativa educativa baseada em dados clínicos. Não é uma promessa de resultado.",
  full: "Esta projeção é calculada pelo motor clínico proprietário do FitJourney com base em seu histórico real, padrões metabólicos e nível de adesão. Os resultados são estimativas educativas e podem variar de acordo com fatores individuais. Consulte sempre seu profissional de saúde.",
  legal: "Projeção gerada pelo FitJourney Intelligence Engine v2.0.0. Os dados apresentados são estimativas baseadas em modelos matemáticos clínicos e não constituem diagnóstico ou garantia de resultado.",
};
