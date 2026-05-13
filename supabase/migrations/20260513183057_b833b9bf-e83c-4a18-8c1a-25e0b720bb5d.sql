
-- ============================================================
-- 1) clinical_shadow_audit: lock down public access
-- ============================================================
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.clinical_shadow_audit;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.clinical_shadow_audit;

CREATE POLICY "Admins can view clinical shadow audit"
  ON public.clinical_shadow_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Linked professionals can view their patients shadow audit"
  ON public.clinical_shadow_audit FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid()
        AND np.patient_id = clinical_shadow_audit.patient_id
        AND np.status = 'active'
    )
  );

-- INSERT: only service role (no policy = blocked for clients; service role bypasses RLS)
-- (intentionally no INSERT policy)

-- ============================================================
-- 2) clinical_event_log: scope to own/linked
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view clinical_event_log" ON public.clinical_event_log;

CREATE POLICY "Patients can view their own clinical events"
  ON public.clinical_event_log FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Linked professionals can view their patients clinical events"
  ON public.clinical_event_log FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid()
        AND np.patient_id = clinical_event_log.patient_id
        AND np.status = 'active'
    )
  );

-- ============================================================
-- 3) engagement_signals: authenticated + scoped
-- ============================================================
DROP POLICY IF EXISTS "Professionals can view engagement signals" ON public.engagement_signals;

CREATE POLICY "Admins can view engagement signals"
  ON public.engagement_signals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Linked professionals can view engagement signals"
  ON public.engagement_signals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid()
        AND np.patient_id = engagement_signals.patient_id
        AND np.status = 'active'
    )
  );

-- ============================================================
-- 4) error_incidents: admin only
-- ============================================================
DROP POLICY IF EXISTS "Admins can view incidents" ON public.error_incidents;
DROP POLICY IF EXISTS "Admins can update incidents" ON public.error_incidents;

CREATE POLICY "Admins can view error incidents"
  ON public.error_incidents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update error incidents"
  ON public.error_incidents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5) macro_audit_log: admin only
-- ============================================================
DROP POLICY IF EXISTS "Audit logs are viewable by authenticated users" ON public.macro_audit_log;

CREATE POLICY "Admins can view macro audit log"
  ON public.macro_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6) sovereign_runtime_logs / system_logs: admin only
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view logs" ON public.sovereign_runtime_logs;

CREATE POLICY "Admins can view sovereign runtime logs"
  ON public.sovereign_runtime_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can view system logs" ON public.system_logs;
DROP POLICY IF EXISTS "Anyone can insert system logs" ON public.system_logs;

CREATE POLICY "Admins can view system logs"
  ON public.system_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert system logs"
  ON public.system_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 7) Tables with RLS enabled but no policy → explicit admin-only
-- ============================================================
CREATE POLICY "Admins can view whatsapp_intent_learning_log"
  ON public.whatsapp_intent_learning_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view rate_limits"
  ON public.rate_limits FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 8) Views: enforce security_invoker
-- ============================================================
ALTER VIEW public.system_health_summary SET (security_invoker = on);
ALTER VIEW public.clinical_divergence_ranking SET (security_invoker = on);
ALTER VIEW public.meal_plan_job_metrics SET (security_invoker = on);
ALTER VIEW public.clinical_observability_dashboard SET (security_invoker = on);
ALTER VIEW public.legacy_rule_heatmap SET (security_invoker = on);

-- ============================================================
-- 9) Pin search_path on functions flagged by linter
-- ============================================================
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'ensure_meal_candidates','trigger_validate_quality','validate_plan_consistency',
    'sync_meal_plan_job_to_pipeline','save_plan_as_approved','check_patient_state_consistency',
    'migrate_to_single_source_of_truth','check_active_meal_plan_job','handle_updated_at',
    'update_updated_at_column','on_patient_state_change','update_patient_engagement',
    'validate_plan_integrity','validate_clinical_quality','trigger_audit_meal_plan',
    'update_meal_plan_totals','check_experience_mode_lock','search_patients',
    'fn_audit_macro_consistency','ensure_default_experience_mode','process_system_log_incident',
    'activate_meal_plan'
  ];
  sig text;
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    FOR sig IN
      SELECT pg_get_function_identity_arguments(p.oid)
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname=fn
    LOOP
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', fn, sig);
    END LOOP;
  END LOOP;
END$$;
