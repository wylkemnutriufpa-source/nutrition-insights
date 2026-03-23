
-- Trigger: notify patient when onboarding is released (journey_status → onboarding_active)
CREATE OR REPLACE FUNCTION public.notify_patient_onboarding_released()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nutri_name text;
BEGIN
  IF NEW.journey_status = 'onboarding_active' AND (OLD.journey_status IS DISTINCT FROM 'onboarding_active') THEN
    SELECT COALESCE(full_name, 'Seu nutricionista') INTO _nutri_name
    FROM public.profiles WHERE user_id = NEW.nutritionist_id;

    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id, target_route)
    VALUES (
      NEW.patient_id,
      'Onboarding liberado! 🎉',
      _nutri_name || ' liberou seu onboarding. Preencha sua anamnese para iniciar.',
      'onboarding_released',
      'onboarding',
      NEW.patient_id,
      '/anamnesis'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_patient_onboarding_released ON public.nutritionist_patients;
CREATE TRIGGER trg_notify_patient_onboarding_released
  AFTER UPDATE ON public.nutritionist_patients
  FOR EACH ROW
  WHEN (NEW.journey_status IS DISTINCT FROM OLD.journey_status)
  EXECUTE FUNCTION public.notify_patient_onboarding_released();
