-- Function to sync weight to history
CREATE OR REPLACE FUNCTION public.sync_profile_weight_to_history()
RETURNS TRIGGER AS $$
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
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for weight sync
DROP TRIGGER IF EXISTS on_profile_weight_change ON public.profiles;
CREATE TRIGGER on_profile_weight_change
AFTER UPDATE OF current_weight_kg ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_weight_to_history();
