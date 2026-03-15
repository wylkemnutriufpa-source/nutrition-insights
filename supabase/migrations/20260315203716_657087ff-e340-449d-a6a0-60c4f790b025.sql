
-- ═══════════════════════════════════════════
-- FASE 16: Clinical Experimentation & Outcome Validation Engine v1.0.0
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.clinical_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  experiment_name text NOT NULL,
  hypothesis_description text NOT NULL DEFAULT '',
  experiment_type text NOT NULL DEFAULT 'protocol_comparison',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_duration_days integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinical_experiment_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.clinical_experiments(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  intervention_definition jsonb NOT NULL DEFAULT '{}',
  expected_mechanism text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinical_experiment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.clinical_experiments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.clinical_experiment_groups(id) ON DELETE CASCADE,
  baseline_snapshot jsonb NOT NULL DEFAULT '{}',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(experiment_id, patient_id)
);

CREATE TABLE IF NOT EXISTS public.clinical_experiment_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.clinical_experiments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  adherence_delta numeric DEFAULT 0,
  weight_delta numeric DEFAULT 0,
  performance_delta numeric DEFAULT 0,
  risk_delta numeric DEFAULT 0,
  dropout_event boolean DEFAULT false,
  stagnation_event boolean DEFAULT false,
  regression_event boolean DEFAULT false,
  evaluation_window_days integer DEFAULT 14,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinical_experiment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.clinical_experiments(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.clinical_experiment_groups(id) ON DELETE CASCADE,
  patients_count integer DEFAULT 0,
  avg_weight_change numeric DEFAULT 0,
  avg_adherence_change numeric DEFAULT 0,
  avg_performance_change numeric DEFAULT 0,
  stagnation_rate numeric DEFAULT 0,
  dropout_rate numeric DEFAULT 0,
  regression_rate numeric DEFAULT 0,
  statistical_signal_strength numeric DEFAULT 0,
  result_interpretation text DEFAULT 'neutral_effect',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(experiment_id, group_id)
);

CREATE TABLE IF NOT EXISTS public.clinical_experiment_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.clinical_experiments(id) ON DELETE CASCADE,
  insight_description text NOT NULL,
  confidence_level text DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.clinical_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_experiment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_experiment_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_experiment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_experiment_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access clinical_experiments" ON public.clinical_experiments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access clinical_experiment_groups" ON public.clinical_experiment_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access clinical_experiment_assignments" ON public.clinical_experiment_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access clinical_experiment_outcomes" ON public.clinical_experiment_outcomes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access clinical_experiment_results" ON public.clinical_experiment_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access clinical_experiment_insights" ON public.clinical_experiment_insights FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_exp_status ON public.clinical_experiments(status);
CREATE INDEX idx_exp_groups_exp ON public.clinical_experiment_groups(experiment_id);
CREATE INDEX idx_exp_assign_exp ON public.clinical_experiment_assignments(experiment_id);
CREATE INDEX idx_exp_assign_patient ON public.clinical_experiment_assignments(patient_id);
CREATE INDEX idx_exp_outcomes_exp ON public.clinical_experiment_outcomes(experiment_id);
CREATE INDEX idx_exp_results_exp ON public.clinical_experiment_results(experiment_id);
