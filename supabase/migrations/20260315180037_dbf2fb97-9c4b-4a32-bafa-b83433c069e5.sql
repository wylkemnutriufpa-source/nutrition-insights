
-- ═══════════════════════════════════════════
-- PHASE 6: Behavioral Dropout Risk Engine
-- ═══════════════════════════════════════════

-- Table: behavioral_recovery_actions
CREATE TABLE public.behavioral_recovery_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  dropout_risk_score INTEGER NOT NULL DEFAULT 0,
  dropout_risk_level TEXT NOT NULL DEFAULT 'baixo',
  suggested_strategy TEXT NOT NULL,
  clinical_reason TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 3,
  cluster_origin TEXT,
  plan_efficacy_score INTEGER,
  days_inactive INTEGER DEFAULT 0,
  adherence_at_moment INTEGER DEFAULT 0,
  engine_version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ,
  applied_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_behavioral_recovery_patient ON public.behavioral_recovery_actions(patient_id);
CREATE INDEX idx_behavioral_recovery_status ON public.behavioral_recovery_actions(status);
CREATE INDEX idx_behavioral_recovery_created ON public.behavioral_recovery_actions(created_at DESC);

-- Enable RLS
ALTER TABLE public.behavioral_recovery_actions ENABLE ROW LEVEL SECURITY;

-- RLS: Nutritionists can see recovery actions for their patients
CREATE POLICY "Nutritionists can view recovery actions for their patients"
ON public.behavioral_recovery_actions
FOR SELECT
TO authenticated
USING (
  patient_id IN (
    SELECT np.patient_id FROM public.nutritionist_patients np
    WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
  )
);

-- RLS: Nutritionists can update status (apply/ignore)
CREATE POLICY "Nutritionists can update recovery actions"
ON public.behavioral_recovery_actions
FOR UPDATE
TO authenticated
USING (
  patient_id IN (
    SELECT np.patient_id FROM public.nutritionist_patients np
    WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
  )
)
WITH CHECK (
  patient_id IN (
    SELECT np.patient_id FROM public.nutritionist_patients np
    WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
  )
);
