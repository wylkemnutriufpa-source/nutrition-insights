-- Function to sync patient data from various sources to the profiles table
CREATE OR REPLACE FUNCTION public.sync_patient_data_to_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_weight NUMERIC;
  v_height NUMERIC;
  v_goal TEXT;
  v_activity_level TEXT;
BEGIN
  -- Determine user_id and extract values based on the source table
  IF TG_TABLE_NAME = 'physical_assessments' THEN
    v_user_id := NEW.patient_id;
    v_weight := NEW.weight;
    v_height := NEW.height;
    
  ELSIF TG_TABLE_NAME = 'patient_anamnesis' THEN
    v_user_id := NEW.user_id;
    -- Handle both direct keys and JSONB answers
    -- Weights and heights can be strings in JSON, so we safe-cast
    v_weight := NULLIF(TRIM(NEW.answers->>'weight'), '')::NUMERIC;
    v_height := NULLIF(TRIM(NEW.answers->>'height'), '')::NUMERIC;
    
    -- Sync goal/objective (handling common variations)
    v_goal := COALESCE(NEW.answers->>'goal', NEW.answers->>'objective');
    
    -- Sync activity level
    v_activity_level := NEW.answers->>'activity_level';
    
  ELSIF TG_TABLE_NAME = 'patient_weight_history' THEN
    v_user_id := NEW.patient_id;
    v_weight := NEW.weight;
  END IF;

  -- Update profiles table only with non-null values to avoid overwriting existing data with NULLs
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

-- Create triggers for each relevant table
DROP TRIGGER IF EXISTS tr_sync_physical_assessment_to_profile ON public.physical_assessments;
CREATE TRIGGER tr_sync_physical_assessment_to_profile
AFTER INSERT OR UPDATE ON public.physical_assessments
FOR EACH ROW EXECUTE FUNCTION public.sync_patient_data_to_profile();

DROP TRIGGER IF EXISTS tr_sync_anamnesis_to_profile ON public.patient_anamnesis;
CREATE TRIGGER tr_sync_anamnesis_to_profile
AFTER INSERT OR UPDATE ON public.patient_anamnesis
FOR EACH ROW EXECUTE FUNCTION public.sync_patient_data_to_profile();

DROP TRIGGER IF EXISTS tr_sync_weight_history_to_profile ON public.patient_weight_history;
CREATE TRIGGER tr_sync_weight_history_to_profile
AFTER INSERT OR UPDATE ON public.patient_weight_history
FOR EACH ROW EXECUTE FUNCTION public.sync_patient_data_to_profile();
