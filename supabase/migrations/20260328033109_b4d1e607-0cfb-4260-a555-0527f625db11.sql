
-- SPRINT 2: Sistema de alertas operacionais
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  function_name text,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write alerts
CREATE POLICY "admins_manage_alerts" ON public.system_alerts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_alerts;

-- SPRINT 3: Agregação diária de checklist
CREATE TABLE IF NOT EXISTS public.checklist_daily_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  summary_date date NOT NULL DEFAULT CURRENT_DATE,
  total_tasks integer DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  completion_rate numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(patient_id, summary_date)
);

ALTER TABLE public.checklist_daily_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_checklist_summary" ON public.checklist_daily_summary
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "system_write_checklist_summary" ON public.checklist_daily_summary
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_checklist_summary_patient_date 
  ON public.checklist_daily_summary(patient_id, summary_date DESC);

CREATE INDEX IF NOT EXISTS idx_system_alerts_unresolved 
  ON public.system_alerts(is_resolved, created_at DESC) 
  WHERE is_resolved = false;
