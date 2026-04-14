
-- Safety-net trigger: detect orphan patient profiles on insert
CREATE OR REPLACE FUNCTION public.detect_orphan_patient_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check if the user has a patient role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'patient') THEN
    -- Check if they have a nutritionist binding
    IF NOT EXISTS (SELECT 1 FROM public.nutritionist_patients WHERE patient_id = NEW.user_id) THEN
      -- Log the orphan detection (non-blocking)
      INSERT INTO public.regression_guard_logs (affected_flow, detected_issue, severity, source_layer, auto_fallback_applied, metadata)
      VALUES (
        'patient_profile_creation',
        'Orphan patient profile detected: ' || NEW.user_id::text || ' (' || COALESCE(NEW.full_name, 'unnamed') || ')',
        'high',
        'database',
        false,
        jsonb_build_object('user_id', NEW.user_id, 'full_name', NEW.full_name)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger (deferred to allow binding to be created in same transaction)
DROP TRIGGER IF EXISTS trg_detect_orphan_patient ON public.profiles;
CREATE TRIGGER trg_detect_orphan_patient
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_orphan_patient_profile();
