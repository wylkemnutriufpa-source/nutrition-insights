
-- Post-workout detailed feedback with body map
CREATE TABLE public.workout_session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  completion_id UUID REFERENCES public.workout_completions(id) ON DELETE CASCADE,
  routine_id UUID,
  plan_id UUID,
  feedback_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_feeling TEXT CHECK (overall_feeling IN ('great','good','neutral','bad','terrible')),
  pain_areas JSONB DEFAULT '[]'::jsonb,
  discomfort_exercises JSONB DEFAULT '[]'::jsonb,
  fatigue_level INT CHECK (fatigue_level BETWEEN 1 AND 10),
  sleep_quality INT CHECK (sleep_quality BETWEEN 1 AND 5),
  motivation_level INT CHECK (motivation_level BETWEEN 1 AND 5),
  notes TEXT,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI-suggested exercise substitutions based on feedback
CREATE TABLE public.workout_exercise_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID REFERENCES public.workout_session_feedback(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  personal_id UUID NOT NULL,
  original_exercise TEXT NOT NULL,
  original_muscle_group TEXT,
  suggested_exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT NOT NULL,
  pain_area TEXT,
  severity TEXT DEFAULT 'moderate' CHECK (severity IN ('mild','moderate','severe')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','modified')),
  approved_exercise TEXT,
  personal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- IFJ learning profile per student for PT
CREATE TABLE public.workout_student_learning_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE,
  personal_id UUID,
  is_also_patient BOOLEAN DEFAULT false,
  total_sessions INT DEFAULT 0,
  avg_effort NUMERIC(3,1) DEFAULT 0,
  avg_completion_rate NUMERIC(5,2) DEFAULT 0,
  pain_history JSONB DEFAULT '[]'::jsonb,
  preferred_exercises JSONB DEFAULT '[]'::jsonb,
  avoided_exercises JSONB DEFAULT '[]'::jsonb,
  fatigue_patterns JSONB DEFAULT '{}'::jsonb,
  motivation_trend TEXT DEFAULT 'stable' CHECK (motivation_trend IN ('rising','stable','declining')),
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low','moderate','high')),
  last_feedback_at TIMESTAMPTZ,
  ifj_notes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_session_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercise_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_student_learning_profile ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Students can insert own feedback" ON public.workout_session_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can view own feedback" ON public.workout_session_feedback
  FOR SELECT TO authenticated USING (auth.uid() = student_id OR EXISTS (
    SELECT 1 FROM public.workout_plans WHERE student_id = workout_session_feedback.student_id AND personal_id = auth.uid()
  ));

CREATE POLICY "PT can view substitutions" ON public.workout_exercise_substitutions
  FOR SELECT TO authenticated USING (auth.uid() = personal_id OR auth.uid() = student_id);
CREATE POLICY "System can insert substitutions" ON public.workout_exercise_substitutions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "PT can update substitutions" ON public.workout_exercise_substitutions
  FOR UPDATE TO authenticated USING (auth.uid() = personal_id);

CREATE POLICY "Profiles viewable by linked users" ON public.workout_student_learning_profile
  FOR SELECT TO authenticated USING (auth.uid() = student_id OR auth.uid() = personal_id);
CREATE POLICY "System can manage profiles" ON public.workout_student_learning_profile
  FOR ALL TO authenticated USING (true);

-- Enable realtime for substitutions
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_exercise_substitutions;
