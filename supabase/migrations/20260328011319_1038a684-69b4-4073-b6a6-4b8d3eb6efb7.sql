-- Harden onboarding sync so completed anamnesis always advances imported/manual patients
-- without depending on a specific frontend route/query param.

CREATE OR REPLACE FUNCTION public.sync_onboarding_pipeline_from_anamnesis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weight numeric;
  v_height numeric;
BEGIN
  IF NEW.user_id IS NULL OR COALESCE(NEW.status, '') <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.answers->>'weight', '') ~ '^[0-9]+([.,][0-9]+)?$' THEN
    v_weight := REPLACE(NEW.answers->>'weight', ',', '.')::numeric;
  END IF;

  IF COALESCE(NEW.answers->>'height', '') ~ '^[0-9]+([.,][0-9]+)?$' THEN
    v_height := REPLACE(NEW.answers->>'height', ',', '.')::numeric;
  END IF;

  UPDATE public.onboarding_pipelines op
  SET anamnesis_completed = true,
      status = CASE
        WHEN op.status = 'pending_anamnesis' THEN 'pending_body_data'
        ELSE op.status
      END,
      weight = COALESCE(v_weight, op.weight),
      height = COALESCE(v_height, op.height),
      updated_at = now()
  WHERE op.patient_id = NEW.user_id
    AND COALESCE(op.release_status, 'released') = 'released'
    AND op.status <> 'completed'
    AND op.status <> 'superseded_by_published_plan';

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_sync_onboarding_from_anamnesis'
      AND tgrelid = 'public.patient_anamnesis'::regclass
  ) THEN
    CREATE TRIGGER trg_sync_onboarding_from_anamnesis
    AFTER INSERT OR UPDATE OF status, answers
    ON public.patient_anamnesis
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_onboarding_pipeline_from_anamnesis();
  END IF;
END;
$$;

-- Backfill already-stuck pipelines (including imported patients that completed anamnesis later)
WITH latest_completed_anamnesis AS (
  SELECT DISTINCT ON (pa.user_id)
    pa.user_id,
    CASE
      WHEN COALESCE(pa.answers->>'weight', '') ~ '^[0-9]+([.,][0-9]+)?$'
        THEN REPLACE(pa.answers->>'weight', ',', '.')::numeric
      ELSE NULL
    END AS weight,
    CASE
      WHEN COALESCE(pa.answers->>'height', '') ~ '^[0-9]+([.,][0-9]+)?$'
        THEN REPLACE(pa.answers->>'height', ',', '.')::numeric
      ELSE NULL
    END AS height
  FROM public.patient_anamnesis pa
  WHERE pa.status = 'completed'
  ORDER BY pa.user_id, pa.created_at DESC
)
UPDATE public.onboarding_pipelines op
SET anamnesis_completed = true,
    status = CASE
      WHEN op.status = 'pending_anamnesis' THEN 'pending_body_data'
      ELSE op.status
    END,
    weight = COALESCE(lca.weight, op.weight),
    height = COALESCE(lca.height, op.height),
    updated_at = now()
FROM latest_completed_anamnesis lca
WHERE op.patient_id = lca.user_id
  AND COALESCE(op.release_status, 'released') = 'released'
  AND op.status <> 'completed'
  AND op.status <> 'superseded_by_published_plan'
  AND COALESCE(op.anamnesis_completed, false) = false;