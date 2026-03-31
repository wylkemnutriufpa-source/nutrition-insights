
-- Replace rate limit function with mode-aware version
CREATE OR REPLACE FUNCTION public.check_simulation_rate_limit(_mode TEXT DEFAULT 'smoke_test')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_per_day INTEGER;
BEGIN
  -- Mode-based limits
  IF _mode = 'manual' THEN
    max_per_day := 1;
  ELSE
    max_per_day := 3;
  END IF;

  -- Check kill switch first
  IF EXISTS (
    SELECT 1 FROM feature_flags
    WHERE key = 'simulator_kill_switch' AND enabled = false
  ) THEN
    RETURN false;
  END IF;

  -- Upsert rate limit counter (keyed by user + date + mode)
  INSERT INTO simulation_rate_limits (user_id, run_date, run_count)
  VALUES (auth.uid(), CURRENT_DATE, 1)
  ON CONFLICT (user_id, run_date)
  DO UPDATE SET run_count = simulation_rate_limits.run_count + 1
  RETURNING run_count INTO current_count;

  RETURN current_count <= max_per_day;
END;
$$;

-- Insert kill switch flag if not exists
INSERT INTO feature_flags (key, enabled, description, graceful_degradation)
VALUES ('simulator_kill_switch', true, 'Kill switch para o simulador automático. Desativar bloqueia todas as execuções.', true)
ON CONFLICT (key) DO NOTHING;

-- Audit log for kill switch toggles
CREATE TABLE IF NOT EXISTS public.simulator_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  previous_state BOOLEAN,
  new_state BOOLEAN,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.simulator_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view simulator audit" ON public.simulator_audit_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert simulator audit" ON public.simulator_audit_log
  FOR INSERT TO authenticated WITH CHECK (performed_by = auth.uid());
