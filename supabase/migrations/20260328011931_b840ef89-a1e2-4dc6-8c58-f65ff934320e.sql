-- Global hardening for onboarding pipeline creation/synchronization.
-- Goal: every active patient link must have exactly one onboarding pipeline,
-- including imported or reactivated patients.

CREATE OR REPLACE FUNCTION public.auto_create_onboarding_pipeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_anamnesis boolean := false;
  _initial_status text := 'pending_anamnesis';
BEGIN
  IF NEW.patient_id IS NULL OR NEW.nutritionist_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.status, '') <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.patient_anamnesis
    WHERE user_id = NEW.patient_id
      AND status = 'completed'
  ) INTO _has_anamnesis;

  _initial_status := CASE
    WHEN _has_anamnesis THEN 'pending_body_data'
    ELSE 'pending_anamnesis'
  END;

  INSERT INTO public.onboarding_pipelines (
    patient_id,
    nutritionist_id,
    status,
    anamnesis_completed,
    release_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.patient_id,
    NEW.nutritionist_id,
    _initial_status,
    _has_anamnesis,
    'released',
    now(),
    now()
  )
  ON CONFLICT DO NOTHING;

  UPDATE public.onboarding_pipelines op
  SET nutritionist_id = NEW.nutritionist_id,
      anamnesis_completed = CASE
        WHEN _has_anamnesis THEN true
        ELSE COALESCE(op.anamnesis_completed, false)
      END,
      status = CASE
        WHEN _has_anamnesis AND op.status = 'pending_anamnesis' THEN 'pending_body_data'
        ELSE op.status
      END,
      release_status = COALESCE(op.release_status, 'released'),
      updated_at = now()
  WHERE op.patient_id = NEW.patient_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_onboarding ON public.nutritionist_patients;
CREATE TRIGGER trg_auto_onboarding
AFTER INSERT OR UPDATE OF status, nutritionist_id, patient_id
ON public.nutritionist_patients
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_onboarding_pipeline();

-- Backfill all active links missing onboarding pipelines.
WITH linked AS (
  SELECT np.patient_id, np.nutritionist_id
  FROM public.nutritionist_patients np
  WHERE np.status = 'active'
),
completed_anamnesis AS (
  SELECT DISTINCT user_id
  FROM public.patient_anamnesis
  WHERE status = 'completed'
)
INSERT INTO public.onboarding_pipelines (
  patient_id,
  nutritionist_id,
  status,
  anamnesis_completed,
  release_status,
  created_at,
  updated_at
)
SELECT
  l.patient_id,
  l.nutritionist_id,
  CASE WHEN ca.user_id IS NOT NULL THEN 'pending_body_data' ELSE 'pending_anamnesis' END,
  (ca.user_id IS NOT NULL),
  'released',
  now(),
  now()
FROM linked l
LEFT JOIN completed_anamnesis ca ON ca.user_id = l.patient_id
LEFT JOIN public.onboarding_pipelines op ON op.patient_id = l.patient_id
WHERE op.patient_id IS NULL;

-- Re-sync existing active pipelines with latest active link ownership/state.
WITH latest_completed_anamnesis AS (
  SELECT DISTINCT user_id
  FROM public.patient_anamnesis
  WHERE status = 'completed'
),
active_links AS (
  SELECT patient_id, nutritionist_id
  FROM public.nutritionist_patients
  WHERE status = 'active'
)
UPDATE public.onboarding_pipelines op
SET nutritionist_id = al.nutritionist_id,
    anamnesis_completed = CASE
      WHEN lca.user_id IS NOT NULL THEN true
      ELSE COALESCE(op.anamnesis_completed, false)
    END,
    status = CASE
      WHEN lca.user_id IS NOT NULL AND op.status = 'pending_anamnesis' THEN 'pending_body_data'
      ELSE op.status
    END,
    release_status = COALESCE(op.release_status, 'released'),
    updated_at = now()
FROM active_links al
LEFT JOIN latest_completed_anamnesis lca ON lca.user_id = al.patient_id
WHERE op.patient_id = al.patient_id;