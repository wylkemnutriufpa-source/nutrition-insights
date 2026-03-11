
-- Trigger: Award points when a meal is logged
CREATE OR REPLACE FUNCTION public.award_meal_logged_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today_count integer;
  _daily_limit integer;
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
  
  IF _today_count < _daily_limit THEN
    INSERT INTO public.patient_points (patient_id, action_key, points, metadata, source_type, source_id)
    VALUES (
      NEW.user_id, 
      'meal_logged', 
      5, 
      jsonb_build_object('meal_id', NEW.id, 'meal_type', NEW.meal_type, 'title', NEW.title),
      'meal',
      NEW.id
    )
    ON CONFLICT (patient_id, action_key, source_id) WHERE source_id IS NOT NULL
    DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_meal_logged
AFTER INSERT ON public.meals
FOR EACH ROW
EXECUTE FUNCTION public.award_meal_logged_points();

-- Trigger: Award points when a check-in is submitted
CREATE OR REPLACE FUNCTION public.award_checkin_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today_count integer;
  _daily_limit integer;
BEGIN
  SELECT COALESCE(daily_limit, 1) INTO _daily_limit
  FROM public.ranking_point_rules 
  WHERE action_key = 'checkin_submitted' AND is_active = true;
  
  IF NOT FOUND THEN RETURN NEW; END IF;
  
  SELECT count(*) INTO _today_count
  FROM public.patient_points
  WHERE patient_id = NEW.patient_id 
  AND action_key = 'checkin_submitted'
  AND earned_at >= date_trunc('day', now());
  
  IF _today_count < _daily_limit THEN
    INSERT INTO public.patient_points (patient_id, action_key, points, metadata, source_type, source_id)
    VALUES (
      NEW.patient_id, 
      'checkin_submitted', 
      25, 
      jsonb_build_object('checkin_id', NEW.id, 'weight', NEW.weight),
      'checkin',
      NEW.id
    )
    ON CONFLICT (patient_id, action_key, source_id) WHERE source_id IS NOT NULL
    DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_checkin_submitted
AFTER INSERT ON public.patient_checkins
FOR EACH ROW
EXECUTE FUNCTION public.award_checkin_points();

-- Trigger: Award points when a recipe is favorited
CREATE OR REPLACE FUNCTION public.award_recipe_favorited_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today_count integer;
  _daily_limit integer;
BEGIN
  SELECT COALESCE(daily_limit, 5) INTO _daily_limit
  FROM public.ranking_point_rules 
  WHERE action_key = 'recipe_favorited' AND is_active = true;
  
  IF NOT FOUND THEN RETURN NEW; END IF;
  
  SELECT count(*) INTO _today_count
  FROM public.patient_points
  WHERE patient_id = NEW.patient_id 
  AND action_key = 'recipe_favorited'
  AND earned_at >= date_trunc('day', now());
  
  IF _today_count < _daily_limit THEN
    INSERT INTO public.patient_points (patient_id, action_key, points, metadata, source_type, source_id)
    VALUES (
      NEW.patient_id, 
      'recipe_favorited', 
      3, 
      jsonb_build_object('recipe_id', NEW.recipe_id),
      'recipe',
      NEW.id
    )
    ON CONFLICT (patient_id, action_key, source_id) WHERE source_id IS NOT NULL
    DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_recipe_favorited
AFTER INSERT ON public.patient_favorite_recipes
FOR EACH ROW
EXECUTE FUNCTION public.award_recipe_favorited_points();

-- Trigger: Award points when meal plan item is followed
CREATE OR REPLACE FUNCTION public.award_meal_plan_followed_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today_count integer;
  _daily_limit integer;
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
    
    IF _today_count < _daily_limit THEN
      INSERT INTO public.patient_points (patient_id, action_key, points, metadata, source_type, source_id)
      VALUES (
        NEW.patient_id, 
        'meal_plan_followed', 
        15, 
        jsonb_build_object('item_id', NEW.meal_plan_item_id, 'date', NEW.date),
        'meal_plan',
        NEW.id
      )
      ON CONFLICT (patient_id, action_key, source_id) WHERE source_id IS NOT NULL
      DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_meal_plan_followed
AFTER INSERT OR UPDATE ON public.meal_item_completions
FOR EACH ROW
EXECUTE FUNCTION public.award_meal_plan_followed_points();

-- Trigger: Award points when anamnesis is completed
CREATE OR REPLACE FUNCTION public.award_anamnesis_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today_count integer;
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    SELECT count(*) INTO _today_count
    FROM public.patient_points
    WHERE patient_id = NEW.user_id 
    AND action_key = 'anamnesis_completed'
    AND earned_at >= date_trunc('day', now());
    
    IF _today_count < 1 THEN
      INSERT INTO public.patient_points (patient_id, action_key, points, metadata, source_type, source_id)
      VALUES (
        NEW.user_id, 
        'anamnesis_completed', 
        30, 
        jsonb_build_object('anamnesis_id', NEW.id),
        'anamnesis',
        NEW.id
      )
      ON CONFLICT (patient_id, action_key, source_id) WHERE source_id IS NOT NULL
      DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_anamnesis_completed
AFTER INSERT OR UPDATE ON public.patient_anamnesis
FOR EACH ROW
EXECUTE FUNCTION public.award_anamnesis_points();
