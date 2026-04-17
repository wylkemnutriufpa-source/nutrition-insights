-- 1) Heal pipelines marked beyond anamnesis but with no anamnesis row
UPDATE public.onboarding_pipelines op
SET body_data_completed = false,
    preferences_completed = false,
    plan_generated = false,
    status = 'pending_anamnesis',
    updated_at = now()
WHERE op.anamnesis_completed = false
  AND op.body_data_completed = true
  AND NOT EXISTS (
    SELECT 1 FROM public.patient_anamnesis pa
    WHERE pa.user_id = op.patient_id
      AND pa.status IN ('completed','draft')
  )
  AND op.status NOT IN ('completed','superseded_by_active_plan','superseded_by_published_plan','superseded_by_reset');

UPDATE public.onboarding_pipelines op
SET anamnesis_completed = false,
    body_data_completed = false,
    preferences_completed = false,
    plan_generated = false,
    status = 'pending_anamnesis',
    updated_at = now()
WHERE op.anamnesis_completed = true
  AND NOT EXISTS (
    SELECT 1 FROM public.patient_anamnesis pa
    WHERE pa.user_id = op.patient_id
      AND pa.status = 'completed'
  )
  AND op.status NOT IN ('completed','superseded_by_active_plan','superseded_by_published_plan','superseded_by_reset');

-- 2) Trigger: when an anamnesis row is deleted, reset the patient's active pipeline back to pending_anamnesis
CREATE OR REPLACE FUNCTION public.fn_reset_pipeline_on_anamnesis_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.onboarding_pipelines
  SET anamnesis_completed = false,
      body_data_completed = false,
      preferences_completed = false,
      plan_generated = false,
      status = 'pending_anamnesis',
      updated_at = now()
  WHERE patient_id = OLD.user_id
    AND status NOT IN ('completed','superseded_by_active_plan','superseded_by_published_plan','superseded_by_reset')
    AND NOT EXISTS (
      SELECT 1 FROM public.patient_anamnesis pa
      WHERE pa.user_id = OLD.user_id
        AND pa.status = 'completed'
    );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_pipeline_on_anamnesis_delete ON public.patient_anamnesis;
CREATE TRIGGER trg_reset_pipeline_on_anamnesis_delete
AFTER DELETE ON public.patient_anamnesis
FOR EACH ROW
EXECUTE FUNCTION public.fn_reset_pipeline_on_anamnesis_delete();