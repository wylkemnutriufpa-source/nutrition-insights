CREATE OR REPLACE FUNCTION public.auto_activate_patient_onboarding(_patient_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.nutritionist_patients
  SET journey_status = 'onboarding_active'
  WHERE patient_id = _patient_id
    AND status = 'active'
    AND journey_status IN ('awaiting_payment', 'awaiting_onboarding_release', 'lead_created');
END;
$function$;