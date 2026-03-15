
-- Phase 20: Global Adaptive Clinical Intelligence Engine

-- 1. Global Clinical Learning State
CREATE TABLE IF NOT EXISTS public.global_clinical_learning_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_component text NOT NULL,
  parameter_name text NOT NULL,
  current_weight numeric NOT NULL DEFAULT 1.0,
  previous_weight numeric,
  adjustment_reason text,
  evidence_strength numeric DEFAULT 0,
  sample_size integer DEFAULT 0,
  engine_version text NOT NULL DEFAULT '1.0.0',
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(engine_component, parameter_name)
);

ALTER TABLE public.global_clinical_learning_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage learning state"
  ON public.global_clinical_learning_state FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can view learning state"
  ON public.global_clinical_learning_state FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'nutritionist'));

-- 2. Global Evidence Signals (computed periodically)
CREATE TABLE IF NOT EXISTS public.global_evidence_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_name text NOT NULL,
  signal_value numeric NOT NULL DEFAULT 0,
  signal_trend text DEFAULT 'stable',
  sample_size integer DEFAULT 0,
  confidence numeric DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  engine_version text NOT NULL DEFAULT '1.0.0'
);

ALTER TABLE public.global_evidence_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage evidence signals"
  ON public.global_evidence_signals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can view evidence signals"
  ON public.global_evidence_signals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'nutritionist'));

-- 3. Platform Maturity History
CREATE TABLE IF NOT EXISTS public.platform_maturity_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maturity_score numeric NOT NULL DEFAULT 0,
  maturity_level text NOT NULL DEFAULT 'early_learning',
  prediction_accuracy numeric DEFAULT 0,
  therapeutic_efficacy numeric DEFAULT 0,
  population_stability numeric DEFAULT 0,
  global_dropout_rate numeric DEFAULT 0,
  result_consistency numeric DEFAULT 0,
  total_patients_analyzed integer DEFAULT 0,
  total_interventions_analyzed integer DEFAULT 0,
  engine_version text NOT NULL DEFAULT '1.0.0',
  computed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_maturity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage maturity history"
  ON public.platform_maturity_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can view maturity history"
  ON public.platform_maturity_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'nutritionist'));

-- 4. Recalibration Audit Log
CREATE TABLE IF NOT EXISTS public.recalibration_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_component text NOT NULL,
  parameter_name text NOT NULL,
  old_weight numeric NOT NULL,
  new_weight numeric NOT NULL,
  adjustment_percent numeric NOT NULL,
  reason text NOT NULL,
  evidence_strength numeric DEFAULT 0,
  sample_size integer DEFAULT 0,
  approved_by uuid,
  status text NOT NULL DEFAULT 'auto_applied',
  rollback_at timestamptz,
  engine_version text NOT NULL DEFAULT '1.0.0',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recalibration_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage recalibration logs"
  ON public.recalibration_audit_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can view recalibration logs"
  ON public.recalibration_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'nutritionist'));
