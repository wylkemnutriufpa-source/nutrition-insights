
-- Create the missing calendar_milestones table that triggers reference
CREATE TABLE IF NOT EXISTS public.calendar_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  milestone_type text NOT NULL,
  milestone_label text NOT NULL,
  milestone_date date NOT NULL,
  source text DEFAULT 'meal_plan',
  entity_id uuid,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(patient_id, milestone_type, milestone_date)
);

-- RLS
ALTER TABLE public.calendar_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage milestones" ON public.calendar_milestones
  FOR ALL TO authenticated
  USING (
    patient_id IN (
      SELECT np.patient_id FROM public.nutritionist_patients np WHERE np.nutritionist_id = auth.uid()
    )
    OR patient_id = auth.uid()
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_calendar_milestones_patient ON public.calendar_milestones(patient_id, milestone_date);
