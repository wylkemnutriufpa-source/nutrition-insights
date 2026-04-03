
-- Table for daily audit results
CREATE TABLE public.plan_audit_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  patient_id UUID,
  audit_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  details JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  audit_run_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_audit_results ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users (diagnostics panel)
CREATE POLICY "Authenticated users can view audit results"
  ON public.plan_audit_results
  FOR SELECT
  TO authenticated
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_plan_audit_results_run ON public.plan_audit_results(audit_run_id);
CREATE INDEX idx_plan_audit_results_type ON public.plan_audit_results(audit_type, severity);
CREATE INDEX idx_plan_audit_results_plan ON public.plan_audit_results(plan_id);

-- Table for patient meal feedback (Point 5)
CREATE TABLE public.patient_meal_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  meal_plan_id UUID REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  meal_plan_item_id UUID,
  feedback_type TEXT NOT NULL DEFAULT 'dislike',
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_meal_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own feedback"
  ON public.patient_meal_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create own feedback"
  ON public.patient_meal_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Nutritionists can view patient feedback"
  ON public.patient_meal_feedback
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_patient_meal_feedback_patient ON public.patient_meal_feedback(patient_id);
CREATE INDEX idx_patient_meal_feedback_plan ON public.patient_meal_feedback(meal_plan_id);
