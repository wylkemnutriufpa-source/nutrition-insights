
-- Program phases table
CREATE TABLE public.program_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  phase_number integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  objective text,
  duration_weeks integer NOT NULL DEFAULT 2,
  nutrition_tips jsonb DEFAULT '[]'::jsonb,
  habits jsonb DEFAULT '[]'::jsonb,
  progress_indicators jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Program owners manage phases"
ON public.program_phases FOR ALL
TO authenticated
USING (public.is_program_owner(auth.uid(), program_id))
WITH CHECK (public.is_program_owner(auth.uid(), program_id));

CREATE POLICY "Enrolled patients view phases"
ON public.program_phases FOR SELECT
TO authenticated
USING (public.is_patient_enrolled_in_program(auth.uid(), program_id));

-- Program patient progress table (weekly check-ins)
CREATE TABLE public.program_patient_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  phase_id uuid REFERENCES public.program_phases(id) ON DELETE SET NULL,
  week_number integer NOT NULL DEFAULT 1,
  weight numeric,
  waist numeric,
  hip numeric,
  adherence_score integer DEFAULT 0,
  habits_completed integer DEFAULT 0,
  habits_total integer DEFAULT 0,
  notes text,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_patient_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutritionists manage progress"
ON public.program_patient_progress FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.nutritionist_patients np
  WHERE np.patient_id = program_patient_progress.patient_id
  AND np.nutritionist_id = auth.uid() AND np.status = 'active'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.nutritionist_patients np
  WHERE np.patient_id = program_patient_progress.patient_id
  AND np.nutritionist_id = auth.uid() AND np.status = 'active'
));

CREATE POLICY "Patients view own progress"
ON public.program_patient_progress FOR SELECT
TO authenticated
USING (auth.uid() = patient_id);

CREATE POLICY "Patients insert own progress"
ON public.program_patient_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = patient_id);

-- Add current_phase to program_patients
ALTER TABLE public.program_patients ADD COLUMN IF NOT EXISTS current_phase integer DEFAULT 1;
ALTER TABLE public.program_patients ADD COLUMN IF NOT EXISTS joined_at date DEFAULT CURRENT_DATE;

-- Enable realtime for progress tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.program_patient_progress;
