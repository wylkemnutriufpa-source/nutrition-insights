
CREATE TABLE public.pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL DEFAULT 'daily',
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  total_patients_processed integer DEFAULT 0,
  steps_completed jsonb DEFAULT '[]'::jsonb,
  steps_failed jsonb DEFAULT '[]'::jsonb,
  execution_log jsonb DEFAULT '[]'::jsonb,
  triggered_by text DEFAULT 'scheduled',
  error_summary text,
  duration_ms integer,
  engine_versions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pipeline_step_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.pipeline_runs(id) ON DELETE CASCADE NOT NULL,
  step_order integer NOT NULL,
  step_name text NOT NULL,
  function_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  patients_processed integer DEFAULT 0,
  output_summary jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.clinical_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  pipeline_run_id uuid REFERENCES public.pipeline_runs(id),
  adherence_score numeric DEFAULT 0,
  clinical_risk_score numeric DEFAULT 0,
  risk_level text DEFAULT 'stable',
  active_alerts_count integer DEFAULT 0,
  weight_trend text DEFAULT 'stable',
  current_weight numeric,
  weight_change_7d numeric,
  days_since_last_checkin integer,
  days_since_last_meal integer,
  checklist_completion_rate numeric DEFAULT 0,
  metabolic_cluster text,
  dropout_risk_score numeric DEFAULT 0,
  momentum_direction text DEFAULT 'stable',
  snapshot_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, snapshot_date)
);

CREATE INDEX idx_pr_status ON public.pipeline_runs(status);
CREATE INDEX idx_pr_started ON public.pipeline_runs(started_at DESC);
CREATE INDEX idx_psr_run ON public.pipeline_step_results(run_id);
CREATE INDEX idx_cds_pat_date ON public.clinical_daily_snapshots(patient_id, snapshot_date DESC);
CREATE INDEX idx_cds_snapdate ON public.clinical_daily_snapshots(snapshot_date DESC);

ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_step_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_view_pipeline_runs" ON public.pipeline_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_manage_pipeline_runs" ON public.pipeline_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "auth_view_step_results" ON public.pipeline_step_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_manage_step_results" ON public.pipeline_step_results FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "view_clinical_snapshots" ON public.clinical_daily_snapshots FOR SELECT TO authenticated
  USING (
    patient_id IN (SELECT np.patient_id FROM public.nutritionist_patients np WHERE np.nutritionist_id = auth.uid() AND np.status = 'active')
    OR patient_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "service_manage_snapshots" ON public.clinical_daily_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
