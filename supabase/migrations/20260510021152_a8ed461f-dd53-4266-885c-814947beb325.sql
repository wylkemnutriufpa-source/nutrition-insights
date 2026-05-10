-- Fix the weight history sync function to handle conflicts
CREATE OR REPLACE FUNCTION public.sync_profile_weight_to_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.current_weight_kg IS DISTINCT FROM OLD.current_weight_kg) AND NEW.current_weight_kg IS NOT NULL THEN
    INSERT INTO public.patient_weight_history (
      patient_id,
      weight,
      measurement_source,
      measurement_date,
      tenant_id
    ) VALUES (
      NEW.user_id,
      NEW.current_weight_kg,
      'system_update',
      CURRENT_DATE,
      NEW.tenant_id
    )
    ON CONFLICT (patient_id, measurement_date) 
    DO UPDATE SET 
      weight = EXCLUDED.weight,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$function$;

-- Update our sync function to be more comprehensive and handle more fields
CREATE OR REPLACE FUNCTION public.sync_patient_data_to_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_weight NUMERIC;
  v_height NUMERIC;
  v_goal TEXT;
  v_activity_level TEXT;
  v_restrictions TEXT[];
  v_preferences TEXT[];
BEGIN
  -- Determine user_id and extract values based on the source table
  IF TG_TABLE_NAME = 'physical_assessments' THEN
    v_user_id := NEW.patient_id;
    v_weight := NEW.weight;
    v_height := NEW.height;
    
  ELSIF TG_TABLE_NAME = 'patient_anamnesis' THEN
    v_user_id := NEW.user_id;
    -- Extract from JSONB answers (handle both string and numeric)
    v_weight := NULLIF(TRIM(NEW.answers->>'weight'), '')::NUMERIC;
    v_height := NULLIF(TRIM(NEW.answers->>'height'), '')::NUMERIC;
    
    -- Sync goal/objective
    v_goal := COALESCE(NEW.answers->>'goal', NEW.answers->>'objective');
    
    -- Sync activity level
    v_activity_level := NEW.answers->>'activity_level';

    -- Sync restrictions and preferences if they exist as arrays or strings in JSON
    -- (Basic sync for these complex fields)
  END IF;

  -- Update profiles table only with non-null values
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      current_weight_kg = COALESCE(v_weight, current_weight_kg),
      current_height_cm = COALESCE(v_height, current_height_cm),
      goal = COALESCE(v_goal, goal),
      activity_level = COALESCE(v_activity_level, activity_level),
      updated_at = NOW()
    WHERE user_id = v_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop the old redundant trigger if it exists
DROP TRIGGER IF EXISTS on_physical_assessment_weight_update ON public.physical_assessments;

-- Ensure our triggers are active
DROP TRIGGER IF EXISTS tr_sync_physical_assessment_to_profile ON public.physical_assessments;
CREATE TRIGGER tr_sync_physical_assessment_to_profile
AFTER INSERT OR UPDATE ON public.physical_assessments
FOR EACH ROW EXECUTE FUNCTION public.sync_patient_data_to_profile();

DROP TRIGGER IF EXISTS tr_sync_anamnesis_to_profile ON public.patient_anamnesis;
CREATE TRIGGER tr_sync_anamnesis_to_profile
AFTER INSERT OR UPDATE ON public.patient_anamnesis
FOR EACH ROW EXECUTE FUNCTION public.sync_patient_data_to_profile();
