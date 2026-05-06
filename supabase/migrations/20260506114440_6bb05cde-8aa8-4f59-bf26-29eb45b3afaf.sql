-- 1. Enable RLS on plan_reconciliation_queue (internal/admin-only table)
ALTER TABLE public.plan_reconciliation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reconciliation queue"
ON public.plan_reconciliation_queue
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Pin search_path on SECURITY DEFINER functions missing it
ALTER FUNCTION public.anonymize_profile_data(target_profile_id uuid) SET search_path = public;
ALTER FUNCTION public.audit_meal_plan_job_transition() SET search_path = public;
ALTER FUNCTION public.audit_trigger_execution() SET search_path = public;
ALTER FUNCTION public.calculate_actual_patient_state(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.calculate_plan_totals(p_plan_id uuid) SET search_path = public;
ALTER FUNCTION public.check_job_anomalies() SET search_path = public;
ALTER FUNCTION public.check_job_system_health() SET search_path = public;
ALTER FUNCTION public.export_clinical_audit(p_patient_id uuid) SET search_path = public;
ALTER FUNCTION public.fail_stuck_meal_plan_jobs() SET search_path = public;
ALTER FUNCTION public.fix_orphaned_patient_links() SET search_path = public;
ALTER FUNCTION public.fn_capture_meal_plan_item_version() SET search_path = public;
ALTER FUNCTION public.fn_reconcile_journey_on_anamnesis() SET search_path = public;
ALTER FUNCTION public.get_advanced_alerts(p_tenant_id uuid, p_alert_type text, p_severity text, p_limit integer, p_offset integer) SET search_path = public;
ALTER FUNCTION public.get_advanced_alerts_paginated(p_tenant_id uuid, p_alert_type text, p_severity text, p_limit integer, p_cursor_timestamp timestamp with time zone, p_cursor_id uuid) SET search_path = public;
ALTER FUNCTION public.get_detailed_plan_diagnostics(p_patient_id uuid) SET search_path = public;
ALTER FUNCTION public.get_filtered_event_timeline(p_patient_id uuid, p_master_item_id uuid, p_plan_mode text, p_limit integer, p_cursor timestamp with time zone) SET search_path = public;
ALTER FUNCTION public.get_meal_plan_job_debug_info() SET search_path = public;
ALTER FUNCTION public.get_patient_event_timeline(p_patient_id uuid) SET search_path = public;
ALTER FUNCTION public.get_plan_diagnostics(p_patient_id uuid) SET search_path = public;
ALTER FUNCTION public.get_plan_drop_metrics(p_patient_id uuid, p_cutoff timestamp with time zone) SET search_path = public;
ALTER FUNCTION public.get_plan_status_distribution(p_patient_id uuid, p_cutoff timestamp with time zone) SET search_path = public;
ALTER FUNCTION public.guardrail_meal_plan_item_updates() SET search_path = public;
ALTER FUNCTION public.guardrail_meal_plan_updates() SET search_path = public;
ALTER FUNCTION public.migrate_all_plans_to_new_model() SET search_path = public;
ALTER FUNCTION public.notify_system_alert() SET search_path = public;
ALTER FUNCTION public.publish_meal_plan_v2(p_plan_id uuid, p_correlation_id uuid) SET search_path = public;
ALTER FUNCTION public.reconcile_patient_plans(p_patient_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) SET search_path = public;
ALTER FUNCTION public.reprocess_dead_letter_job(dlq_id uuid) SET search_path = public;
ALTER FUNCTION public.run_patient_realtime_fix(_patient_id uuid) SET search_path = public;
ALTER FUNCTION public.trigger_process_meal_plan_job() SET search_path = public;