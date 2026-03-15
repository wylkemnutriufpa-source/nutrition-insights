
-- ═══════════════════════════════════════════
-- FASE 15: Clinical Simulation & Intervention Scenario Engine v1.0.0
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.clinical_intervention_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  current_plan_id uuid,
  current_protocol_id uuid,
  simulation_type text NOT NULL DEFAULT 'no_change_monitoring',
  simulated_intervention jsonb NOT NULL DEFAULT '{}',
  baseline_state jsonb NOT NULL DEFAULT '{}',
  projected_outcomes jsonb NOT NULL DEFAULT '{}',
  projected_risks jsonb NOT NULL DEFAULT '{}',
  recommended_decision text NOT NULL DEFAULT 'keep_and_monitor',
  simulation_confidence_score integer NOT NULL DEFAULT 50,
  confidence_classification text NOT NULL DEFAULT 'media_confianca',
  engine_version text NOT NULL DEFAULT '1.0.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.clinical_intervention_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on clinical_intervention_simulations"
  ON public.clinical_intervention_simulations FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX idx_sim_patient ON public.clinical_intervention_simulations(patient_id);
CREATE INDEX idx_sim_type ON public.clinical_intervention_simulations(simulation_type);
CREATE INDEX idx_sim_created ON public.clinical_intervention_simulations(created_at DESC);
