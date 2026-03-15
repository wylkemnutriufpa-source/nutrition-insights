
-- ═══════════════════════════════════════════
-- FASE 5: TABELA DE INTERVENÇÕES TERAPÊUTICAS
-- ═══════════════════════════════════════════

CREATE TABLE public.nutritional_intervention_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  plan_id UUID REFERENCES public.meal_plans(id) ON DELETE SET NULL,
  intervention_type TEXT NOT NULL,
  caloric_adjustment_percent NUMERIC,
  clinical_reason TEXT NOT NULL,
  cluster_origin TEXT,
  risk_at_moment TEXT,
  efficacy_score NUMERIC,
  engine_version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ,
  applied_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_nis_patient_status ON public.nutritional_intervention_suggestions(patient_id, status);
CREATE INDEX idx_nis_created ON public.nutritional_intervention_suggestions(created_at DESC);

-- RLS
ALTER TABLE public.nutritional_intervention_suggestions ENABLE ROW LEVEL SECURITY;

-- Nutritionists can see suggestions for their patients
CREATE POLICY "Nutritionists can view intervention suggestions"
  ON public.nutritional_intervention_suggestions FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT np.patient_id FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
  );

-- Nutritionists can update (apply/ignore) suggestions for their patients
CREATE POLICY "Nutritionists can update intervention suggestions"
  ON public.nutritional_intervention_suggestions FOR UPDATE TO authenticated
  USING (
    patient_id IN (
      SELECT np.patient_id FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
  );

-- Service role inserts via edge function (no INSERT policy needed for anon/authenticated)

-- Add plan_therapeutic_efficacy_score to meal_plans
ALTER TABLE public.meal_plans ADD COLUMN IF NOT EXISTS therapeutic_efficacy_score NUMERIC;
