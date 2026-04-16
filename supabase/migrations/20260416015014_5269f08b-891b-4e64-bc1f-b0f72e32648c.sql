
-- Fix journey_status for patients that have incomplete pipelines but journey_status = 'active'
UPDATE public.nutritionist_patients np
SET journey_status = 'onboarding_active'
WHERE np.status = 'active'
  AND np.journey_status = 'active'
  AND EXISTS (
    SELECT 1 FROM public.onboarding_pipelines op
    WHERE op.patient_id = np.patient_id
    AND op.status IN ('pending_anamnesis', 'pending_body_data', 'pending_preferences', 'in_progress')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.meal_plans mp
    WHERE mp.patient_id = np.patient_id
    AND mp.is_active = true
  );

-- Fix patient with plan_published but no active plans — set to active
UPDATE public.nutritionist_patients
SET journey_status = 'active'
WHERE patient_id = '5d873a9e-f2df-404f-b400-25dd1fd58224'
  AND journey_status = 'plan_published'
  AND NOT EXISTS (
    SELECT 1 FROM public.meal_plans mp
    WHERE mp.patient_id = '5d873a9e-f2df-404f-b400-25dd1fd58224'
    AND mp.is_active = true
  );

-- Create trigger to auto-sync journey_status when pipeline status changes
CREATE OR REPLACE FUNCTION public.fn_sync_journey_from_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When pipeline moves to pending_body_data, pending_preferences, in_progress → ensure onboarding_active
  IF NEW.status IN ('pending_anamnesis', 'pending_body_data', 'pending_preferences', 'in_progress', 'pending_plan_generation') THEN
    UPDATE public.nutritionist_patients
    SET journey_status = 'onboarding_active'
    WHERE patient_id = NEW.patient_id
      AND status = 'active'
      AND journey_status NOT IN ('onboarding_active', 'plan_published', 'active_followup', 'clinical_followup_active');
  END IF;

  -- When pipeline completes → set onboarding_completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.nutritionist_patients
    SET journey_status = 'onboarding_completed'
    WHERE patient_id = NEW.patient_id
      AND status = 'active'
      AND journey_status = 'onboarding_active';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS trg_sync_journey_from_pipeline ON public.onboarding_pipelines;
CREATE TRIGGER trg_sync_journey_from_pipeline
  AFTER UPDATE ON public.onboarding_pipelines
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_journey_from_pipeline();
