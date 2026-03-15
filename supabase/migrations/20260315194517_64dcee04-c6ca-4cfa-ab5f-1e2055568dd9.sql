
-- ═══════════════════════════════════════════
-- FASE 9: Clinical Portfolio Orchestration Engine
-- ═══════════════════════════════════════════

-- 1. Patient Clinical Priority State
CREATE TABLE public.patient_clinical_priority_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  nutritionist_id UUID NOT NULL,
  priority_score NUMERIC DEFAULT 0,
  priority_level TEXT DEFAULT 'low_priority',
  main_priority_reason TEXT,
  risk_score_component NUMERIC DEFAULT 0,
  dropout_risk_component NUMERIC DEFAULT 0,
  therapeutic_failure_component NUMERIC DEFAULT 0,
  cluster_risk_component NUMERIC DEFAULT 0,
  plan_efficacy_component NUMERIC DEFAULT 0,
  time_without_intervention_component NUMERIC DEFAULT 0,
  last_professional_contact_at TIMESTAMPTZ,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  engine_version TEXT DEFAULT '1.0.0',
  UNIQUE(patient_id, nutritionist_id)
);

-- 2. Clinical Action Recommendations
CREATE TABLE public.clinical_action_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  nutritionist_id UUID NOT NULL,
  recommended_action TEXT NOT NULL,
  urgency_level TEXT DEFAULT 'medium',
  reason TEXT NOT NULL,
  expected_clinical_impact TEXT,
  supporting_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  acted_at TIMESTAMPTZ,
  acted_by UUID,
  engine_version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Weekly Clinical Orchestration Plan
CREATE TABLE public.weekly_clinical_orchestration_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID NOT NULL,
  week_start DATE NOT NULL,
  prioritized_patients JSONB DEFAULT '[]'::jsonb,
  suggested_focus_actions JSONB DEFAULT '[]'::jsonb,
  workload_balance_score NUMERIC DEFAULT 50,
  total_critical INTEGER DEFAULT 0,
  total_high INTEGER DEFAULT 0,
  total_medium INTEGER DEFAULT 0,
  engine_version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(nutritionist_id, week_start)
);

-- 4. Clinic Portfolio State
CREATE TABLE public.clinic_portfolio_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID NOT NULL UNIQUE,
  portfolio_health_score NUMERIC DEFAULT 50,
  portfolio_classification TEXT DEFAULT 'carteira_estavel',
  total_patients INTEGER DEFAULT 0,
  patients_at_risk_percent NUMERIC DEFAULT 0,
  avg_plan_efficacy NUMERIC DEFAULT 0,
  avg_adherence NUMERIC DEFAULT 0,
  dropout_rate NUMERIC DEFAULT 0,
  avg_metabolic_evolution NUMERIC DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_priority_count INTEGER DEFAULT 0,
  engine_version TEXT DEFAULT '1.0.0',
  last_calculated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS
ALTER TABLE public.patient_clinical_priority_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_action_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_clinical_orchestration_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_portfolio_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage own priority state"
  ON public.patient_clinical_priority_state FOR ALL TO authenticated
  USING (nutritionist_id = auth.uid()) WITH CHECK (nutritionist_id = auth.uid());

CREATE POLICY "Nutritionists manage own action recommendations"
  ON public.clinical_action_recommendations FOR ALL TO authenticated
  USING (nutritionist_id = auth.uid()) WITH CHECK (nutritionist_id = auth.uid());

CREATE POLICY "Nutritionists manage own weekly plan"
  ON public.weekly_clinical_orchestration_plan FOR ALL TO authenticated
  USING (nutritionist_id = auth.uid()) WITH CHECK (nutritionist_id = auth.uid());

CREATE POLICY "Nutritionists manage own portfolio state"
  ON public.clinic_portfolio_state FOR ALL TO authenticated
  USING (nutritionist_id = auth.uid()) WITH CHECK (nutritionist_id = auth.uid());

-- 6. Indexes
CREATE INDEX idx_priority_state_nutritionist ON public.patient_clinical_priority_state(nutritionist_id);
CREATE INDEX idx_priority_state_level ON public.patient_clinical_priority_state(priority_level);
CREATE INDEX idx_action_recommendations_status ON public.clinical_action_recommendations(status, nutritionist_id);
CREATE INDEX idx_weekly_plan_week ON public.weekly_clinical_orchestration_plan(nutritionist_id, week_start);
