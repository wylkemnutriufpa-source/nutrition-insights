
-- ═══════════════════════════════════════════
-- FASE 19: Adaptive Safe Clinical Automation
-- ═══════════════════════════════════════════

-- Patient automation state (safe zone classification)
CREATE TABLE IF NOT EXISTS public.patient_automation_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  automation_zone text NOT NULL DEFAULT 'no_automation',
  prediction_confidence numeric DEFAULT 0,
  performance_level numeric DEFAULT 0,
  physiological_stability numeric DEFAULT 0,
  dropout_risk numeric DEFAULT 0,
  regression_risk numeric DEFAULT 0,
  cluster_type text DEFAULT 'unknown',
  longitudinal_stability numeric DEFAULT 0,
  automation_enabled boolean DEFAULT true,
  automation_level text DEFAULT 'suggest_only',
  engine_version text DEFAULT '1.0.0',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(patient_id)
);

ALTER TABLE public.patient_automation_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read automation state"
  ON public.patient_automation_state FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage automation state"
  ON public.patient_automation_state FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Clinical auto-adjustment logs
CREATE TABLE IF NOT EXISTS public.clinical_auto_adjustment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  adjustment_type text NOT NULL,
  adjustment_parameters jsonb DEFAULT '{}'::jsonb,
  triggering_driver text NOT NULL,
  expected_clinical_effect text,
  automation_confidence numeric DEFAULT 0,
  approved_by_guardrail boolean DEFAULT false,
  was_reversed boolean DEFAULT false,
  reversed_at timestamptz,
  reversal_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.clinical_auto_adjustment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read auto adjustment logs"
  ON public.clinical_auto_adjustment_logs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage auto adjustment logs"
  ON public.clinical_auto_adjustment_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patient_automation_state_patient ON public.patient_automation_state(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_automation_state_zone ON public.patient_automation_state(automation_zone);
CREATE INDEX IF NOT EXISTS idx_auto_adjustment_logs_patient ON public.clinical_auto_adjustment_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_auto_adjustment_logs_type ON public.clinical_auto_adjustment_logs(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_auto_adjustment_logs_created ON public.clinical_auto_adjustment_logs(created_at DESC);
