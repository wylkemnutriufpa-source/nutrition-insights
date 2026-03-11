
-- ════════════════════════════════════════════════════════
-- INTEGRITY SYSTEM: Anti-gaming for point attribution
-- ════════════════════════════════════════════════════════

-- 1. Replace checklist trigger with integrity checks
CREATE OR REPLACE FUNCTION public.award_checklist_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today_count integer;
  _daily_limit integer;
  _burst_1min integer;
  _burst_5min integer;
  _first_completion_today timestamptz;
  _total_today integer;
  _effective_points integer;
  _integrity_note text;
BEGIN
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    
    SELECT COALESCE(daily_limit, 20) INTO _daily_limit
    FROM public.ranking_point_rules 
    WHERE action_key = 'checklist_complete' AND is_active = true;
    IF NOT FOUND THEN RETURN NEW; END IF;

    -- Daily limit check
    SELECT count(*) INTO _today_count
    FROM public.patient_points
    WHERE patient_id = NEW.patient_id 
    AND action_key = 'checklist_complete'
    AND earned_at >= date_trunc('day', now());

    IF _today_count >= _daily_limit THEN RETURN NEW; END IF;

    -- INTEGRITY CHECK 1: Burst in last 60 seconds
    SELECT count(*) INTO _burst_1min
    FROM public.checklist_tasks
    WHERE patient_id = NEW.patient_id
    AND date = NEW.date
    AND completed = true
    AND completed_at IS NOT NULL
    AND completed_at >= (now() - interval '60 seconds');

    -- INTEGRITY CHECK 2: Burst in last 5 minutes
    SELECT count(*) INTO _burst_5min
    FROM public.checklist_tasks
    WHERE patient_id = NEW.patient_id
    AND date = NEW.date
    AND completed = true
    AND completed_at IS NOT NULL
    AND completed_at >= (now() - interval '5 minutes');

    -- INTEGRITY CHECK 3: All-at-once detection
    SELECT MIN(completed_at) INTO _first_completion_today
    FROM public.checklist_tasks
    WHERE patient_id = NEW.patient_id
    AND date = NEW.date
    AND completed = true
    AND completed_at IS NOT NULL;

    SELECT count(*) INTO _total_today
    FROM public.checklist_tasks
    WHERE patient_id = NEW.patient_id
    AND date = NEW.date
    AND completed = true;

    -- Determine effective points based on integrity
    _effective_points := 10; -- base points
    _integrity_note := 'normal';

    -- If >8 tasks completed in 5 min: zero points (clearly gaming)
    IF _burst_5min > 8 THEN
      _effective_points := 0;
      _integrity_note := 'blocked_burst_5min';
    -- If >3 tasks in 60 seconds: heavily reduced
    ELSIF _burst_1min > 3 THEN
      _effective_points := 1;
      _integrity_note := 'reduced_burst_1min';
    -- If many tasks done and all within 10 min window: reduce
    ELSIF _total_today > 10 AND _first_completion_today IS NOT NULL 
      AND (now() - _first_completion_today) < interval '10 minutes' THEN
      _effective_points := 2;
      _integrity_note := 'reduced_all_at_once';
    -- Moderate burst (>2 in 60s): slight reduction
    ELSIF _burst_1min > 2 THEN
      _effective_points := 5;
      _integrity_note := 'reduced_moderate_burst';
    END IF;

    -- Only insert if points > 0
    IF _effective_points > 0 THEN
      INSERT INTO public.patient_points (patient_id, action_key, points, metadata, source_type, source_id)
      VALUES (
        NEW.patient_id, 
        'checklist_complete', 
        _effective_points, 
        jsonb_build_object(
          'task_id', NEW.id, 
          'task_title', NEW.title, 
          'category', NEW.category,
          'integrity', _integrity_note,
          'burst_1min', _burst_1min,
          'burst_5min', _burst_5min
        ),
        'checklist',
        NEW.id
      )
      ON CONFLICT (patient_id, action_key, source_id) WHERE source_id IS NOT NULL
      DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Replace meal logged trigger with integrity
CREATE OR REPLACE FUNCTION public.award_meal_logged_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today_count integer;
  _daily_limit integer;
  _burst_2min integer;
  _effective_points integer;
  _integrity_note text;
BEGIN
  SELECT COALESCE(daily_limit, 5) INTO _daily_limit
  FROM public.ranking_point_rules 
  WHERE action_key = 'meal_logged' AND is_active = true;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT count(*) INTO _today_count
  FROM public.patient_points
  WHERE patient_id = NEW.user_id 
  AND action_key = 'meal_logged'
  AND earned_at >= date_trunc('day', now());

  IF _today_count >= _daily_limit THEN RETURN NEW; END IF;

  -- Burst check: meals logged in last 2 minutes
  SELECT count(*) INTO _burst_2min
  FROM public.meals
  WHERE user_id = NEW.user_id
  AND created_at >= (now() - interval '2 minutes');

  _effective_points := 5;
  _integrity_note := 'normal';

  -- If >2 meals in 2 minutes: suspicious
  IF _burst_2min > 2 THEN
    _effective_points := 0;
    _integrity_note := 'blocked_burst';
  ELSIF _burst_2min > 1 THEN
    _effective_points := 2;
    _integrity_note := 'reduced_burst';
  END IF;

  IF _effective_points > 0 THEN
    INSERT INTO public.patient_points (patient_id, action_key, points, metadata, source_type, source_id)
    VALUES (
      NEW.user_id, 'meal_logged', _effective_points, 
      jsonb_build_object('meal_id', NEW.id, 'meal_type', NEW.meal_type, 'integrity', _integrity_note),
      'meal', NEW.id
    )
    ON CONFLICT (patient_id, action_key, source_id) WHERE source_id IS NOT NULL
    DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Replace meal plan followed trigger with integrity
CREATE OR REPLACE FUNCTION public.award_meal_plan_followed_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today_count integer;
  _daily_limit integer;
  _burst_1min integer;
  _effective_points integer;
  _integrity_note text;
BEGIN
  IF NEW.adherence_status = 'followed' AND NEW.completed = true THEN
    SELECT COALESCE(daily_limit, 6) INTO _daily_limit
    FROM public.ranking_point_rules 
    WHERE action_key = 'meal_plan_followed' AND is_active = true;
    IF NOT FOUND THEN RETURN NEW; END IF;

    SELECT count(*) INTO _today_count
    FROM public.patient_points
    WHERE patient_id = NEW.patient_id 
    AND action_key = 'meal_plan_followed'
    AND earned_at >= date_trunc('day', now());
    IF _today_count >= _daily_limit THEN RETURN NEW; END IF;

    -- Burst: adherence marked in last 60 seconds
    SELECT count(*) INTO _burst_1min
    FROM public.meal_item_completions
    WHERE patient_id = NEW.patient_id
    AND completed = true
    AND completed_at IS NOT NULL
    AND completed_at >= (now() - interval '60 seconds');

    _effective_points := 15;
    _integrity_note := 'normal';

    IF _burst_1min > 4 THEN
      _effective_points := 2;
      _integrity_note := 'reduced_burst';
    ELSIF _burst_1min > 2 THEN
      _effective_points := 8;
      _integrity_note := 'reduced_moderate';
    END IF;

    IF _effective_points > 0 THEN
      INSERT INTO public.patient_points (patient_id, action_key, points, metadata, source_type, source_id)
      VALUES (
        NEW.patient_id, 'meal_plan_followed', _effective_points, 
        jsonb_build_object('item_id', NEW.meal_plan_item_id, 'date', NEW.date, 'integrity', _integrity_note),
        'meal_plan', NEW.id
      )
      ON CONFLICT (patient_id, action_key, source_id) WHERE source_id IS NOT NULL
      DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
