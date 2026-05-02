-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nutritionist_patients' AND column_name = 'updated_at') THEN
    ALTER TABLE public.nutritionist_patients ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;

-- Create update_updated_at_column function if it doesn't exist (already exists in most projects)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for nutritionist_patients
DROP TRIGGER IF EXISTS trg_nutritionist_patients_updated_at ON public.nutritionist_patients;
CREATE TRIGGER trg_nutritionist_patients_updated_at
BEFORE UPDATE ON public.nutritionist_patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fix/Ensure sync_onboarding_pipeline_from_anamnesis is robust
CREATE OR REPLACE FUNCTION public.sync_onboarding_pipeline_from_anamnesis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_weight numeric;
  v_height numeric;
BEGIN
  -- Só processa se a anamnese foi marcada como completa
  IF NEW.user_id IS NULL OR COALESCE(NEW.status, '') <> 'completed' THEN
    RETURN NEW;
  END IF;

  -- Extração segura de peso/altura para o pipeline
  IF COALESCE(NEW.answers->>'weight', '') ~ '^[0-9]+([.,][0-9]+)?$' THEN
    v_weight := REPLACE(NEW.answers->>'weight', ',', '.')::numeric;
  END IF;

  IF COALESCE(NEW.answers->>'height', '') ~ '^[0-9]+([.,][0-9]+)?$' THEN
    v_height := REPLACE(NEW.answers->>'height', ',', '.')::numeric;
  END IF;

  -- 1. Atualiza o pipeline
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
    AND op.status NOT IN ('completed', 'superseded_by_published_plan');

  -- 2. Transição automática journey_status -> 'active'
  UPDATE public.nutritionist_patients
  SET journey_status = 'active',
      updated_at = now()
  WHERE patient_id = NEW.user_id
    AND status = 'active'
    AND journey_status IN ('onboarding_active', 'lead_created', 'awaiting_consent');

  RETURN NEW;
END;
$function$;
