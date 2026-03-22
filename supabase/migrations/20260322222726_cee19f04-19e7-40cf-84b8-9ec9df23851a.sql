
-- ============================================================
-- OBSERVABILITY LAYER: Core Tables
-- ============================================================

-- 1. System Error Logs
CREATE TABLE public.system_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text DEFAULT 'unknown',
  module text NOT NULL,
  page_route text,
  action_attempted text,
  error_message text NOT NULL,
  stack_trace text,
  severity text NOT NULL DEFAULT 'medium',
  auto_recovered boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_system_error_logs_created ON public.system_error_logs(created_at DESC);
CREATE INDEX idx_system_error_logs_severity ON public.system_error_logs(severity);
CREATE INDEX idx_system_error_logs_module ON public.system_error_logs(module);

-- 2. System Performance Logs
CREATE TABLE public.system_performance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_name text NOT NULL,
  user_role text,
  execution_time_ms integer NOT NULL,
  queries_count integer DEFAULT 0,
  api_calls_count integer DEFAULT 0,
  success boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_perf_logs_flow ON public.system_performance_logs(flow_name);
CREATE INDEX idx_perf_logs_created ON public.system_performance_logs(created_at DESC);

-- 3. User Behavior Events
CREATE TABLE public.user_behavior_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text DEFAULT 'unknown',
  event_name text NOT NULL,
  context jsonb DEFAULT '{}',
  page text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_behavior_events_user ON public.user_behavior_events(user_id);
CREATE INDEX idx_behavior_events_name ON public.user_behavior_events(event_name);
CREATE INDEX idx_behavior_events_created ON public.user_behavior_events(created_at DESC);

-- 4. Silent Failures Monitor
CREATE TABLE public.silent_failures_monitor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text,
  expected_action text NOT NULL,
  failure_reason text,
  days_since_expected integer DEFAULT 0,
  severity text DEFAULT 'medium',
  resolved boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_silent_failures_type ON public.silent_failures_monitor(entity_type);
CREATE INDEX idx_silent_failures_severity ON public.silent_failures_monitor(severity);
CREATE INDEX idx_silent_failures_created ON public.silent_failures_monitor(created_at DESC);

-- 5. Clinical Pipeline Runs
CREATE TABLE public.clinical_pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  patients_processed integer DEFAULT 0,
  flags_generated integer DEFAULT 0,
  tasks_generated integer DEFAULT 0,
  messages_generated integer DEFAULT 0,
  errors_detected integer DEFAULT 0,
  execution_time_ms integer DEFAULT 0,
  run_mode text DEFAULT 'manual',
  error_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_runs_created ON public.clinical_pipeline_runs(created_at DESC);
CREATE INDEX idx_pipeline_runs_nutri ON public.clinical_pipeline_runs(nutritionist_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silent_failures_monitor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Error logs: authenticated users can insert their own, read their own
CREATE POLICY "Users can insert error logs" ON public.system_error_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can read own error logs" ON public.system_error_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);

-- Performance logs: anyone authenticated can insert/read
CREATE POLICY "Insert perf logs" ON public.system_performance_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Read perf logs" ON public.system_performance_logs
  FOR SELECT TO authenticated USING (true);

-- Behavior events: insert own, read own
CREATE POLICY "Insert own behavior events" ON public.user_behavior_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Read own behavior events" ON public.user_behavior_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Silent failures: authenticated can read/insert
CREATE POLICY "Insert silent failures" ON public.silent_failures_monitor
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Read silent failures" ON public.silent_failures_monitor
  FOR SELECT TO authenticated USING (true);

-- Pipeline runs: nutritionist reads own
CREATE POLICY "Insert pipeline runs" ON public.clinical_pipeline_runs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Read own pipeline runs" ON public.clinical_pipeline_runs
  FOR SELECT TO authenticated USING (nutritionist_id = auth.uid() OR nutritionist_id IS NULL);

-- ============================================================
-- Cleanup function for data retention (90 days)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_observability_logs(retention_days integer DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff timestamptz := now() - (retention_days || ' days')::interval;
  deleted_errors integer;
  deleted_perf integer;
  deleted_behavior integer;
  deleted_silent integer;
BEGIN
  DELETE FROM public.system_error_logs WHERE created_at < cutoff;
  GET DIAGNOSTICS deleted_errors = ROW_COUNT;

  DELETE FROM public.system_performance_logs WHERE created_at < cutoff;
  GET DIAGNOSTICS deleted_perf = ROW_COUNT;

  DELETE FROM public.user_behavior_events WHERE created_at < cutoff;
  GET DIAGNOSTICS deleted_behavior = ROW_COUNT;

  DELETE FROM public.silent_failures_monitor WHERE created_at < cutoff AND resolved = true;
  GET DIAGNOSTICS deleted_silent = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted_errors', deleted_errors,
    'deleted_perf', deleted_perf,
    'deleted_behavior', deleted_behavior,
    'deleted_silent', deleted_silent,
    'cutoff', cutoff
  );
END;
$$;

-- ============================================================
-- System Health Score RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_system_health_score()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  error_rate numeric;
  avg_perf numeric;
  recent_errors integer;
  recent_silent integer;
  health_score integer;
BEGIN
  -- Error rate last 24h
  SELECT count(*) INTO recent_errors
  FROM public.system_error_logs
  WHERE created_at > now() - interval '24 hours' AND severity IN ('high', 'critical');

  -- Avg performance last 24h
  SELECT coalesce(avg(execution_time_ms), 0) INTO avg_perf
  FROM public.system_performance_logs
  WHERE created_at > now() - interval '24 hours';

  -- Silent failures unresolved
  SELECT count(*) INTO recent_silent
  FROM public.silent_failures_monitor
  WHERE resolved = false AND severity IN ('high', 'critical');

  -- Calculate health score
  health_score := 100;
  health_score := health_score - LEAST(recent_errors * 5, 30);
  health_score := health_score - CASE WHEN avg_perf > 3000 THEN 20 WHEN avg_perf > 1500 THEN 10 ELSE 0 END;
  health_score := health_score - LEAST(recent_silent * 3, 20);
  health_score := GREATEST(health_score, 0);

  RETURN jsonb_build_object(
    'health_score', health_score,
    'recent_critical_errors', recent_errors,
    'avg_response_ms', round(avg_perf),
    'unresolved_silent_failures', recent_silent,
    'status', CASE
      WHEN health_score >= 80 THEN 'healthy'
      WHEN health_score >= 50 THEN 'attention'
      ELSE 'critical'
    END,
    'computed_at', now()
  );
END;
$$;
