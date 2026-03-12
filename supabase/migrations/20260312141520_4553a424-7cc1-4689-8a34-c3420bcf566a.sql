
-- Onboarding pipeline table to track patient automated onboarding flow
CREATE TABLE public.onboarding_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  nutritionist_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_anamnesis',
  -- Steps tracking
  anamnesis_completed BOOLEAN DEFAULT false,
  body_data_completed BOOLEAN DEFAULT false,
  preferences_completed BOOLEAN DEFAULT false,
  plan_generated BOOLEAN DEFAULT false,
  plan_approved BOOLEAN DEFAULT false,
  -- Data collected
  weight NUMERIC,
  height NUMERIC,
  photo_front_url TEXT,
  photo_side_url TEXT,
  photo_back_url TEXT,
  wake_time TEXT,
  sleep_time TEXT,
  meal_count INTEGER DEFAULT 5,
  cooking_preference TEXT,
  food_preferences JSONB DEFAULT '{}',
  -- Generated plan reference
  generated_plan_id UUID REFERENCES public.meal_plans(id),
  generated_plan_data JSONB,
  -- Scheduling criteria (same as Biquíni Branco)
  use_scheduling_criteria BOOLEAN DEFAULT false,
  scheduling_criteria JSONB DEFAULT '{"auto_deactivate_previous": true, "weight_enabled": false, "weight_loss_kg": 1, "checklist_enabled": true, "checklist_min_adherence": 80, "checklist_days": 14, "feedback_enabled": true, "feedback_interval_days": 15, "extension_days": 15, "max_extensions": 2, "current_extensions": 0, "manual_only": false}',
  -- Professional approval
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(patient_id, nutritionist_id)
);

ALTER TABLE public.onboarding_pipelines ENABLE ROW LEVEL SECURITY;

-- Patients can see their own pipeline
CREATE POLICY "Patients can view own pipeline"
ON public.onboarding_pipelines FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

-- Patients can update their own pipeline (filling steps)
CREATE POLICY "Patients can update own pipeline"
ON public.onboarding_pipelines FOR UPDATE
TO authenticated
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());

-- Nutritionists can manage pipelines for their patients
CREATE POLICY "Nutritionists can manage pipelines"
ON public.onboarding_pipelines FOR ALL
TO authenticated
USING (nutritionist_id = auth.uid());

-- Admins can see all
CREATE POLICY "Admins can manage all pipelines"
ON public.onboarding_pipelines FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.onboarding_pipelines;
