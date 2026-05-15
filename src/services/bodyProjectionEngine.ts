/**
 * Body Projection Engine (Manual Fallback)
 */
export interface VisualStateSeed {
  rendering_profile: "male" | "female" | "neutral";
  adiposity_level: "very_high" | "high" | "moderate" | "low" | "very_low";
  muscularity_level: "very_low" | "low" | "moderate" | "moderate_to_high" | "high";
  body_frame_type: "small" | "medium" | "large";
  silhouette_class: string;
  glow_intensity: number;
  transformation_magnitude: number;
}

export interface ProjectionHorizon {
  timeframe: string;
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

export interface HistoricalAnalysis {
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

export const computeFullProjection: any = () => ({ horizons: [], currentMetrics: {}, historicalAnalysis: {} });
export const analyzeWeightHistory: any = () => ({});
export const evaluateAccuracy: any = () => ({ score: 100 });