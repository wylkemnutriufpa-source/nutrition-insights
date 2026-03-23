
CREATE TABLE public.system_diagnostic_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID REFERENCES public.system_diagnostic_logs(id) ON DELETE CASCADE,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'ok', 'warning', 'critical')),
  module TEXT NOT NULL,
  message TEXT NOT NULL,
  detail TEXT,
  context_json JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_diagnostic_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read diagnostic entries"
ON public.system_diagnostic_entries FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert diagnostic entries"
ON public.system_diagnostic_entries FOR INSERT TO authenticated
WITH CHECK (true);

CREATE INDEX idx_diagnostic_entries_run_id ON public.system_diagnostic_entries(run_id);
CREATE INDEX idx_diagnostic_entries_severity ON public.system_diagnostic_entries(severity);
