
-- Create onboarding_tokens table for secure token-based onboarding links
CREATE TABLE public.onboarding_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  patient_id UUID NOT NULL,
  nutritionist_id UUID NOT NULL,
  pipeline_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  tenant_id UUID REFERENCES public.tenants(id)
);

-- Index for fast token lookups
CREATE INDEX idx_onboarding_tokens_token ON public.onboarding_tokens(token);
CREATE INDEX idx_onboarding_tokens_patient ON public.onboarding_tokens(patient_id);

-- Enable RLS
ALTER TABLE public.onboarding_tokens ENABLE ROW LEVEL SECURITY;

-- Nutritionists can create tokens for their patients
CREATE POLICY "Nutritionists can create onboarding tokens"
  ON public.onboarding_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = nutritionist_id);

-- Nutritionists can view their own tokens
CREATE POLICY "Nutritionists can view their tokens"
  ON public.onboarding_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = nutritionist_id OR auth.uid() = patient_id);

-- Nutritionists can update (revoke) their tokens
CREATE POLICY "Nutritionists can update their tokens"
  ON public.onboarding_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = nutritionist_id);

-- Create RPC for public token validation (used by intake page before auth)
CREATE OR REPLACE FUNCTION public.validate_onboarding_token(_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _record RECORD;
  _result JSON;
BEGIN
  SELECT t.id, t.patient_id, t.nutritionist_id, t.pipeline_id, t.status, t.expires_at,
         p.full_name as patient_name, np.full_name as nutritionist_name
  INTO _record
  FROM public.onboarding_tokens t
  LEFT JOIN public.profiles p ON p.user_id = t.patient_id
  LEFT JOIN public.profiles np ON np.user_id = t.nutritionist_id
  WHERE t.token = _token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'TOKEN_NOT_FOUND');
  END IF;

  IF _record.status = 'revoked' THEN
    RETURN json_build_object('valid', false, 'error', 'TOKEN_REVOKED');
  END IF;

  IF _record.status = 'used' THEN
    RETURN json_build_object('valid', false, 'error', 'TOKEN_USED');
  END IF;

  IF _record.expires_at < now() THEN
    UPDATE public.onboarding_tokens SET status = 'expired' WHERE token = _token;
    RETURN json_build_object('valid', false, 'error', 'TOKEN_EXPIRED');
  END IF;

  RETURN json_build_object(
    'valid', true,
    'patient_id', _record.patient_id,
    'nutritionist_id', _record.nutritionist_id,
    'pipeline_id', _record.pipeline_id,
    'patient_name', _record.patient_name,
    'nutritionist_name', _record.nutritionist_name
  );
END;
$$;

-- Create RPC for official onboarding reset (archives old pipeline, creates fresh one, generates new token)
CREATE OR REPLACE FUNCTION public.reset_onboarding_pipeline(
  _patient_id UUID,
  _nutritionist_id UUID,
  _tenant_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_pipeline_id UUID;
  _new_token TEXT;
  _new_token_id UUID;
BEGIN
  -- 1. Archive/supersede all existing pipelines for this patient
  UPDATE public.onboarding_pipelines
  SET status = 'superseded_by_reset'
  WHERE patient_id = _patient_id
    AND status NOT IN ('completed', 'superseded_by_active_plan', 'superseded_by_published_plan', 'superseded_by_reset');

  -- 2. Revoke all active tokens
  UPDATE public.onboarding_tokens
  SET status = 'revoked'
  WHERE patient_id = _patient_id AND status = 'active';

  -- 3. Delete old anamnesis drafts (keep completed for history by marking status)
  UPDATE public.patient_anamnesis
  SET status = 'archived'
  WHERE user_id = _patient_id AND status IN ('draft', 'completed');

  -- 4. Create fresh pipeline
  INSERT INTO public.onboarding_pipelines (
    patient_id, nutritionist_id, status,
    anamnesis_completed, body_data_completed, preferences_completed,
    plan_generated, plan_approved, tenant_id, release_status
  ) VALUES (
    _patient_id, _nutritionist_id, 'pending_anamnesis',
    false, false, false,
    false, false, _tenant_id, 'released'
  )
  RETURNING id INTO _new_pipeline_id;

  -- 5. Generate new token
  INSERT INTO public.onboarding_tokens (
    patient_id, nutritionist_id, pipeline_id, tenant_id
  ) VALUES (
    _patient_id, _nutritionist_id, _new_pipeline_id, _tenant_id
  )
  RETURNING id, token INTO _new_token_id, _new_token;

  -- 6. Sync lifecycle
  UPDATE public.nutritionist_patients
  SET journey_status = 'onboarding_active'
  WHERE patient_id = _patient_id AND status = 'active';

  RETURN json_build_object(
    'success', true,
    'pipeline_id', _new_pipeline_id,
    'token', _new_token,
    'token_id', _new_token_id
  );
END;
$$;
