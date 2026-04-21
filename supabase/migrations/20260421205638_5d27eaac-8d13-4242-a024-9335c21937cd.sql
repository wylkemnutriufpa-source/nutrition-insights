-- Add persistent sync state columns to onboarding_pipelines
ALTER TABLE public.onboarding_pipelines
  ADD COLUMN IF NOT EXISTS sync_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sync_error text,
  ADD COLUMN IF NOT EXISTS sync_last_attempt_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS sync_attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_onboarding_pipelines_sync_pending
  ON public.onboarding_pipelines (sync_pending)
  WHERE sync_pending = true;

-- RPC: mark sync pending (called from frontend when RPC fails)
CREATE OR REPLACE FUNCTION public.mark_onboarding_sync_pending(
  _patient_id uuid,
  _error_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the patient themselves or their nutritionist may flag
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.onboarding_pipelines
     SET sync_pending = true,
         sync_error = LEFT(COALESCE(_error_message, 'unknown error'), 1000),
         sync_last_attempt_at = now(),
         sync_attempts = COALESCE(sync_attempts, 0) + 1,
         updated_at = now()
   WHERE patient_id = _patient_id
     AND (patient_id = auth.uid() OR nutritionist_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
END;
$$;

-- RPC: clear sync pending (called when sync succeeds)
CREATE OR REPLACE FUNCTION public.clear_onboarding_sync_pending(
  _patient_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.onboarding_pipelines
     SET sync_pending = false,
         sync_error = NULL,
         sync_last_attempt_at = now(),
         updated_at = now()
   WHERE patient_id = _patient_id
     AND (patient_id = auth.uid() OR nutritionist_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_onboarding_sync_pending(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_onboarding_sync_pending(uuid) TO authenticated;