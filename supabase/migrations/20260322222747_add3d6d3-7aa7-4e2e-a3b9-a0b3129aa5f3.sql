
-- Tighten INSERT policies to require auth.uid() match where possible
DROP POLICY "Users can insert error logs" ON public.system_error_logs;
CREATE POLICY "Users insert own error logs" ON public.system_error_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY "Insert perf logs" ON public.system_performance_logs;
CREATE POLICY "Insert perf logs auth" ON public.system_performance_logs
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY "Insert silent failures" ON public.silent_failures_monitor;
CREATE POLICY "Insert silent failures auth" ON public.silent_failures_monitor
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY "Insert pipeline runs" ON public.clinical_pipeline_runs;
CREATE POLICY "Insert own pipeline runs" ON public.clinical_pipeline_runs
  FOR INSERT TO authenticated WITH CHECK (nutritionist_id = auth.uid() OR nutritionist_id IS NULL);
