
-- Personal trainer students linking table
CREATE TABLE IF NOT EXISTS public.personal_trainer_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL,
  student_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (personal_id, student_id)
);
ALTER TABLE public.personal_trainer_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pts_select" ON public.personal_trainer_students FOR SELECT TO authenticated
  USING (personal_id = auth.uid() OR student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pts_insert" ON public.personal_trainer_students FOR INSERT TO authenticated
  WITH CHECK (personal_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pts_update" ON public.personal_trainer_students FOR UPDATE TO authenticated
  USING (personal_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pts_delete" ON public.personal_trainer_students FOR DELETE TO authenticated
  USING (personal_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Workout plans
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL,
  student_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wp_access" ON public.workout_plans FOR ALL TO authenticated
  USING (personal_id = auth.uid() OR student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Workout routines (A/B/C/D)
CREATE TABLE IF NOT EXISTS public.workout_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  day_of_week integer,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wr_access" ON public.workout_routines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_plans wp WHERE wp.id = plan_id AND (wp.personal_id = auth.uid() OR wp.student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- Exercises
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES public.workout_routines(id) ON DELETE CASCADE,
  name text NOT NULL,
  sets integer NOT NULL DEFAULT 3,
  reps text NOT NULL DEFAULT '12',
  load_kg numeric,
  rest_seconds integer DEFAULT 60,
  notes text,
  image_url text,
  video_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "we_access" ON public.workout_exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_routines wr JOIN public.workout_plans wp ON wp.id = wr.plan_id WHERE wr.id = routine_id AND (wp.personal_id = auth.uid() OR wp.student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- Workout completions
CREATE TABLE IF NOT EXISTS public.workout_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  routine_id uuid NOT NULL REFERENCES public.workout_routines(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  duration_minutes integer,
  perceived_effort integer,
  notes text,
  pain_report text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc_access" ON public.workout_completions FOR ALL TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.workout_plans wp WHERE wp.id = plan_id AND wp.personal_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Exercise logs
CREATE TABLE IF NOT EXISTS public.workout_exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  completion_id uuid NOT NULL REFERENCES public.workout_completions(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  load_kg numeric,
  reps_done text,
  sets_done integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_exercise_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wel_access" ON public.workout_exercise_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_completions wc WHERE wc.id = completion_id AND (wc.student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.workout_plans wp WHERE wp.id = wc.plan_id AND wp.personal_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))));

-- Point rules
INSERT INTO public.ranking_point_rules (action_key, action_label, points, daily_limit, is_active)
VALUES 
  ('workout_completed', 'Treino completo', 20, 2, true),
  ('training_streak', 'Streak de treino', 10, 1, true)
ON CONFLICT (action_key) DO NOTHING;

-- Gamification trigger
CREATE OR REPLACE FUNCTION public.award_workout_completed_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _today_count integer; _daily_limit integer;
BEGIN
  SELECT COALESCE(daily_limit, 2) INTO _daily_limit FROM public.ranking_point_rules WHERE action_key = 'workout_completed' AND is_active = true;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT count(*) INTO _today_count FROM public.patient_points WHERE patient_id = NEW.student_id AND action_key = 'workout_completed' AND earned_at >= date_trunc('day', now());
  IF _today_count < _daily_limit THEN
    INSERT INTO public.patient_points (patient_id, action_key, points, metadata, source_type, source_id)
    VALUES (NEW.student_id, 'workout_completed', 20, jsonb_build_object('routine_id', NEW.routine_id, 'effort', NEW.perceived_effort), 'workout', NEW.id)
    ON CONFLICT (patient_id, action_key, source_id) WHERE source_id IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_award_workout_points AFTER INSERT ON public.workout_completions FOR EACH ROW EXECUTE FUNCTION public.award_workout_completed_points();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_completions;
