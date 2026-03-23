
CREATE TABLE IF NOT EXISTS public.system_diagnostic_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_by UUID REFERENCES auth.users(id),
  health_score INTEGER NOT NULL DEFAULT 0,
  report_json JSONB NOT NULL DEFAULT '{}',
  critical_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  ok_count INTEGER NOT NULL DEFAULT 0,
  test_type TEXT NOT NULL DEFAULT 'full',
  duration_ms INTEGER
);

ALTER TABLE public.system_diagnostic_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage diagnostic logs"
  ON public.system_diagnostic_logs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
