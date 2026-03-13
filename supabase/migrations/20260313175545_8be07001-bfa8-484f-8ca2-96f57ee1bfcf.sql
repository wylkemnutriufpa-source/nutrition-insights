
-- Auto-create onboarding pipeline when a patient is linked to a nutritionist
CREATE OR REPLACE FUNCTION public.auto_create_onboarding_pipeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only for new active links
  IF NEW.status = 'active' THEN
    INSERT INTO public.onboarding_pipelines (patient_id, nutritionist_id, status)
    VALUES (NEW.patient_id, NEW.nutritionist_id, 'pending_anamnesis')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop if exists to avoid duplicate
DROP TRIGGER IF EXISTS trg_auto_onboarding ON public.nutritionist_patients;

CREATE TRIGGER trg_auto_onboarding
  AFTER INSERT ON public.nutritionist_patients
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_onboarding_pipeline();
