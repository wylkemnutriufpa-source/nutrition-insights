-- =========================================================
-- route_audit_alerts: alerts triggered by audit-public-routes
-- =========================================================
CREATE TABLE IF NOT EXISTS public.route_audit_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pathname TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  audit_run_id UUID,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_audit_alerts_unresolved
  ON public.route_audit_alerts (created_at DESC)
  WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_route_audit_alerts_pathname
  ON public.route_audit_alerts (pathname);

ALTER TABLE public.route_audit_alerts ENABLE ROW LEVEL SECURITY;

-- Admin-only read
CREATE POLICY "Admins can view route audit alerts"
  ON public.route_audit_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only update (mark resolved)
CREATE POLICY "Admins can update route audit alerts"
  ON public.route_audit_alerts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin-only delete (cleanup)
CREATE POLICY "Admins can delete route audit alerts"
  ON public.route_audit_alerts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Inserts happen via service-role (edge function); no public insert policy needed.

-- =========================================================
-- qa_checklist_runs: manual QA executions (mobile flows etc.)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.qa_checklist_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_key TEXT NOT NULL,
  device_label TEXT,
  user_agent TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  passed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  audit_snapshot JSONB,
  telemetry_snapshot JSONB,
  executed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qa_checklist_runs_created
  ON public.qa_checklist_runs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qa_checklist_runs_key
  ON public.qa_checklist_runs (checklist_key, created_at DESC);

ALTER TABLE public.qa_checklist_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view qa checklist runs"
  ON public.qa_checklist_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert qa checklist runs"
  ON public.qa_checklist_runs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND executed_by = auth.uid()
  );

CREATE POLICY "Admins can update qa checklist runs"
  ON public.qa_checklist_runs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete qa checklist runs"
  ON public.qa_checklist_runs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));