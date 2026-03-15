
-- ═══════════════════════════════════════════
-- FASE 14: Clinical Outcome Prediction Engine v1.0.0
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.patient_predicted_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  predicted_goal_achievement_probability integer NOT NULL DEFAULT 50,
  predicted_stagnation_probability integer NOT NULL DEFAULT 30,
  predicted_dropout_probability integer NOT NULL DEFAULT 20,
  predicted_regression_probability integer NOT NULL DEFAULT 15,
  predicted_time_to_next_intervention_days integer NOT NULL DEFAULT 7,
  prediction_confidence_score integer NOT NULL DEFAULT 50,
  main_prediction_driver text NOT NULL DEFAULT 'positive_momentum',
  prediction_window_days integer NOT NULL DEFAULT 30,
  goal_classification text NOT NULL DEFAULT 'moderate',
  stagnation_classification text NOT NULL DEFAULT 'baixo_risco',
  dropout_classification text NOT NULL DEFAULT 'baixo_risco',
  regression_classification text NOT NULL DEFAULT 'baixo_risco',
  confidence_classification text NOT NULL DEFAULT 'media_confianca',
  calculation_metadata jsonb DEFAULT '{}',
  engine_version text NOT NULL DEFAULT '1.0.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id)
);

ALTER TABLE public.patient_predicted_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on patient_predicted_outcomes"
  ON public.patient_predicted_outcomes FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX idx_predicted_outcomes_patient ON public.patient_predicted_outcomes(patient_id);
CREATE INDEX idx_predicted_outcomes_driver ON public.patient_predicted_outcomes(main_prediction_driver);
CREATE INDEX idx_predicted_outcomes_confidence ON public.patient_predicted_outcomes(prediction_confidence_score);
