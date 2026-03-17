
-- Table to store generated patient journey stories
CREATE TABLE public.patient_journey_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  generated_by uuid,
  story_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  narrative_opening text,
  narrative_diagnosis text,
  narrative_closing text,
  current_phase text DEFAULT 'initial',
  weight_trend text,
  risk_level text DEFAULT 'low',
  projections jsonb DEFAULT '[]'::jsonb,
  metrics_snapshot jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'generated',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_journey_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own stories"
ON public.patient_journey_stories FOR SELECT
USING (auth.uid() = patient_id);

CREATE POLICY "Professionals can view patient stories"
ON public.patient_journey_stories FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = patient_journey_stories.patient_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  )
);

CREATE POLICY "System can insert stories"
ON public.patient_journey_stories FOR INSERT
WITH CHECK (auth.uid() = patient_id OR auth.uid() = generated_by);

CREATE INDEX idx_journey_stories_patient ON public.patient_journey_stories (patient_id, created_at DESC);
