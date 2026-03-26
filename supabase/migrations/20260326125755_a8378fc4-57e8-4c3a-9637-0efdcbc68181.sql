
-- Personal records table
CREATE TABLE IF NOT EXISTS public.workout_personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  exercise_library_id UUID REFERENCES public.exercises_library(id),
  record_type TEXT NOT NULL DEFAULT 'load',
  value NUMERIC(8,2) NOT NULL,
  previous_value NUMERIC(8,2),
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completion_id UUID REFERENCES public.workout_completions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own PRs" ON public.workout_personal_records
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "System can insert PRs" ON public.workout_personal_records
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Personal can view student PRs" ON public.workout_personal_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_professional_links
      WHERE patient_id = workout_personal_records.student_id
      AND professional_id = auth.uid()
      AND link_status = 'active'
    )
  );

-- Periodization table
CREATE TABLE IF NOT EXISTS public.workout_periodization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  personal_id UUID NOT NULL,
  mesocycle_name TEXT NOT NULL DEFAULT 'Mesociclo 1',
  mesocycle_weeks INT NOT NULL DEFAULT 4,
  current_week INT NOT NULL DEFAULT 1,
  progression_type TEXT NOT NULL DEFAULT 'linear',
  progression_percent NUMERIC(4,1) NOT NULL DEFAULT 5.0,
  deload_week INT,
  deload_reduction_percent NUMERIC(4,1) DEFAULT 40.0,
  auto_progress_enabled BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_periodization ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal can manage periodization" ON public.workout_periodization
  FOR ALL TO authenticated
  USING (personal_id = auth.uid())
  WITH CHECK (personal_id = auth.uid());

-- Cardio prescriptions table  
CREATE TABLE IF NOT EXISTS public.cardio_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  personal_id UUID NOT NULL,
  cardio_type TEXT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  target_hr_zone TEXT,
  target_hr_min INT,
  target_hr_max INT,
  distance_km NUMERIC(6,2),
  frequency_per_week INT NOT NULL DEFAULT 3,
  intensity TEXT NOT NULL DEFAULT 'moderate',
  interval_protocol JSONB,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cardio_prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal can manage cardio" ON public.cardio_prescriptions
  FOR ALL TO authenticated
  USING (personal_id = auth.uid())
  WITH CHECK (personal_id = auth.uid());

CREATE POLICY "Students can view own cardio" ON public.cardio_prescriptions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Cross-professional sync alerts
CREATE TABLE IF NOT EXISTS public.cross_professional_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  source_professional_id UUID NOT NULL,
  source_role TEXT NOT NULL,
  target_role TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cross_professional_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can view relevant alerts" ON public.cross_professional_alerts
  FOR SELECT TO authenticated
  USING (
    source_professional_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.patient_professional_links
      WHERE patient_id = cross_professional_alerts.patient_id
      AND professional_id = auth.uid()
      AND link_status = 'active'
    )
  );

CREATE POLICY "System can insert alerts" ON public.cross_professional_alerts
  FOR INSERT TO authenticated
  WITH CHECK (source_professional_id = auth.uid());

CREATE POLICY "Professionals can update alerts" ON public.cross_professional_alerts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_professional_links
      WHERE patient_id = cross_professional_alerts.patient_id
      AND professional_id = auth.uid()
      AND link_status = 'active'
    )
  );
