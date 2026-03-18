CREATE OR REPLACE FUNCTION public.auto_create_onboarding_pipeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _has_anamnesis boolean;
  _initial_status text;
BEGIN
  IF NEW.status = 'active' THEN
    -- Check if patient already has a completed anamnesis
    SELECT EXISTS(
      SELECT 1 FROM public.patient_anamnesis
      WHERE user_id = NEW.patient_id AND status = 'completed'
    ) INTO _has_anamnesis;

    _initial_status := CASE WHEN _has_anamnesis THEN 'pending_body_data' ELSE 'pending_anamnesis' END;

    INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status, anamnesis_completed)
    VALUES (NEW.patient_id, NEW.nutritionist_id, _initial_status, _has_anamnesis)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$