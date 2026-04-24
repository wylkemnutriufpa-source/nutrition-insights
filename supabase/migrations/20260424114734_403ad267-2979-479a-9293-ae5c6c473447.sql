-- Create audit log table for experience mode change attempts
CREATE TABLE IF NOT EXISTS public.experience_mode_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  correlation_id TEXT NOT NULL,
  attempted_mode TEXT NOT NULL,
  previous_mode TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'blocked', 'failed', 'offline_queued', 'offline_replayed')),
  reason TEXT,
  error_code TEXT,
  unlock_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for filtering / report
CREATE INDEX IF NOT EXISTS idx_emal_user_id ON public.experience_mode_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_emal_correlation ON public.experience_mode_audit_log(correlation_id);
CREATE INDEX IF NOT EXISTS idx_emal_outcome ON public.experience_mode_audit_log(outcome);
CREATE INDEX IF NOT EXISTS idx_emal_created_at ON public.experience_mode_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.experience_mode_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can insert their own log entries
CREATE POLICY "Users can insert their own audit entries"
ON public.experience_mode_audit_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own audit entries
CREATE POLICY "Users can view their own audit entries"
ON public.experience_mode_audit_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all entries (uses existing has_role function if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
    EXECUTE $POLICY$
      CREATE POLICY "Admins can view all audit entries"
      ON public.experience_mode_audit_log
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role))
    $POLICY$;
  END IF;
END $$;