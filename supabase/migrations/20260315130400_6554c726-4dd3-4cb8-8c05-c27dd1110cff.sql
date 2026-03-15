
-- ═══════════════════════════════════════════
-- PHASE 3: Adaptive Nutrition Decision Engine
-- ═══════════════════════════════════════════

-- 1. Patient Clinical State table
CREATE TABLE IF NOT EXISTS public.patient_clinical_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  caloric_response_status TEXT NOT NULL DEFAULT 'neutro',
  stagnation_risk_level TEXT NOT NULL DEFAULT 'baixo',
  calorie_target NUMERIC,
  calorie_avg_real NUMERIC,
  weight_velocity_pct NUMERIC,
  adherence_avg_28d NUMERIC,
  engagement_avg_28d NUMERIC,
  plan_active_days INTEGER DEFAULT 0,
  analysis_window_days INTEGER DEFAULT 28,
  data_points_used INTEGER DEFAULT 0,
  calculation_version TEXT DEFAULT '1.0.0',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_id)
);

ALTER TABLE public.patient_clinical_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists can view their patients clinical state"
ON public.patient_clinical_state FOR SELECT TO authenticated
USING (
  patient_id IN (
    SELECT np.patient_id FROM public.nutritionist_patients np
    WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
  )
);

CREATE INDEX IF NOT EXISTS idx_patient_clinical_state_patient ON public.patient_clinical_state(patient_id);

-- 2. Meal Plan Adjustment Suggestions table
CREATE TABLE IF NOT EXISTS public.meal_plan_adjustment_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  meal_plan_id UUID,
  suggestion_type TEXT NOT NULL, -- 'caloric_adjustment' | 'template_switch'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'auto_applied'
  current_value NUMERIC,
  suggested_value NUMERIC,
  delta_percent NUMERIC,
  clinical_reason TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high'
  metadata JSONB DEFAULT '{}'::jsonb,
  engine_version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

ALTER TABLE public.meal_plan_adjustment_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists can manage their patients suggestions"
ON public.meal_plan_adjustment_suggestions FOR ALL TO authenticated
USING (
  patient_id IN (
    SELECT np.patient_id FROM public.nutritionist_patients np
    WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
  )
);

CREATE INDEX IF NOT EXISTS idx_adjustment_suggestions_patient ON public.meal_plan_adjustment_suggestions(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_adjustment_suggestions_created ON public.meal_plan_adjustment_suggestions(created_at DESC);

-- 3. Add therapeutic_effectiveness_status to meal_plans
ALTER TABLE public.meal_plans ADD COLUMN IF NOT EXISTS therapeutic_effectiveness_status TEXT DEFAULT 'pending_evaluation';

-- 4. Add stagnation_risk_level to patient_clinical_snapshots
ALTER TABLE public.patient_clinical_snapshots ADD COLUMN IF NOT EXISTS caloric_response_status TEXT;
ALTER TABLE public.patient_clinical_snapshots ADD COLUMN IF NOT EXISTS stagnation_risk_level TEXT;
ALTER TABLE public.patient_clinical_snapshots ADD COLUMN IF NOT EXISTS therapeutic_effectiveness TEXT;
