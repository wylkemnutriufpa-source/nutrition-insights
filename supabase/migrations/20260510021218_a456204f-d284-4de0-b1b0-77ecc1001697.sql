-- Correct the weight history sync function (remove updated_at which doesn't exist)
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
      weight = EXCLUDED.weight;
  END IF;
  RETURN NEW;
END;
$function$;
