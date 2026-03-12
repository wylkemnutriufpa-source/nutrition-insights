
-- Add missing columns to workout_plans
ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS objective text DEFAULT 'general';
ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' NOT NULL;

-- Add missing columns to workout_routines
ALTER TABLE public.workout_routines ADD COLUMN IF NOT EXISTS day_of_week integer;
ALTER TABLE public.workout_routines ADD COLUMN IF NOT EXISTS estimated_duration integer DEFAULT 60;

-- Add missing columns to workout_exercises
ALTER TABLE public.workout_exercises ADD COLUMN IF NOT EXISTS muscle_group text DEFAULT 'other';
ALTER TABLE public.workout_exercises ADD COLUMN IF NOT EXISTS media_url text;

-- Add discomfort_flag to workout_completions (separate from pain_report text)
ALTER TABLE public.workout_completions ADD COLUMN IF NOT EXISTS discomfort_flag boolean DEFAULT false;

-- Update the anti-abuse trigger for workout completions
CREATE OR REPLACE FUNCTION public.award_workout_completed_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  _today_count integer;
  _daily_limit integer;
  _effective_points integer;
  _integrity_note text;
  _burst_10min integer;
  _duration integer;
  _identical_count integer;
BEGIN
  SELECT COALESCE(daily_limit, 2) INTO _daily_limit 
  FROM public.ranking_point_rules WHERE action_key = 'workout_completed' AND is_active = true;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Daily limit
  SELECT count(*) INTO _today_count 
  FROM public.patient_points 
  WHERE patient_id = NEW.student_id AND action_key = 'workout_completed' 
  AND earned_at >= date_trunc('day', now());
  IF _today_count >= _daily_limit THEN RETURN NEW; END IF;

  _effective_points := 20;
  _integrity_note := 'normal';
  _duration := COALESCE(NEW.duration_minutes, 0);

  -- ANTI-ABUSE: completion in < 3 minutes = suspicious
  IF _duration > 0 AND _duration < 3 THEN
    _effective_points := 0;
    _integrity_note := 'blocked_too_fast';
  -- < 5 min = reduced
  ELSIF _duration > 0 AND _duration < 5 THEN
    _effective_points := 3;
    _integrity_note := 'reduced_very_fast';
  END IF;

  -- ANTI-ABUSE: burst completions in 10 min window
  IF _effective_points > 0 THEN
    SELECT count(*) INTO _burst_10min
    FROM public.workout_completions
    WHERE student_id = NEW.student_id
    AND completed_at >= (now() - interval '10 minutes');
    
    IF _burst_10min > 2 THEN
      _effective_points := 0;
      _integrity_note := 'blocked_burst';
    END IF;
  END IF;

  -- ANTI-ABUSE: identical sequential logs (same routine, same effort, same duration within 1h)
  IF _effective_points > 0 THEN
    SELECT count(*) INTO _identical_count
    FROM public.workout_completions
    WHERE student_id = NEW.student_id
    AND routine_id = NEW.routine_id
    AND perceived_effort = NEW.perceived_effort
    AND duration_minutes = NEW.duration_minutes
    AND completed_at >= (now() - interval '1 hour')
    AND id != NEW.id;
    
    IF _identical_count > 0 THEN
      _effective_points := 2;
      _integrity_note := 'reduced_identical';
    END IF;
  END IF;

  IF _effective_points > 0 THEN
    INSERT INTO public.patient_points (patient_id, action_key, points, metadata, source_type, source_id)
    VALUES (
      NEW.student_id, 'workout_completed', _effective_points, 
      jsonb_build_object(
        'routine_id', NEW.routine_id, 
        'effort', NEW.perceived_effort,
        'duration', _duration,
        'integrity', _integrity_note
      ), 
      'workout', NEW.id
    )
    ON CONFLICT (patient_id, action_key, source_id) WHERE source_id IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
