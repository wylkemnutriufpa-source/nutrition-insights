
DROP POLICY IF EXISTS "Shared meal plans visible with active token" ON public.meal_plans;

CREATE OR REPLACE FUNCTION public.get_shared_meal_plan(_token uuid)
RETURNS SETOF public.meal_plans
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.meal_plans
  WHERE sharing_token = _token
    AND is_sharing_enabled = true
    AND sharing_expires_at IS NOT NULL
    AND sharing_expires_at > now()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_meal_plan(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Clinical telemetry insert by authenticated" ON public.clinical_telemetry;
CREATE POLICY "Clinical telemetry insert by owner or linked professional"
  ON public.clinical_telemetry FOR INSERT TO authenticated
  WITH CHECK (
    patient_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = clinical_telemetry.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Public professional profiles are viewable by everyone" ON public.professional_profiles;
CREATE POLICY "Linked patients can view their professional profile"
  ON public.professional_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = professional_profiles.user_id
        AND np.patient_id = auth.uid()
        AND np.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Only admins can view diagnostics" ON public.invitation_diagnostics;
CREATE POLICY "Only admins can view diagnostics"
  ON public.invitation_diagnostics FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "System can insert export logs" ON public.audit_exports_log;
CREATE POLICY "Users can insert own export logs"
  ON public.audit_exports_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can insert system logs" ON public.system_logs;
CREATE POLICY "Users can insert own system logs"
  ON public.system_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR (user_id IS NULL AND has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "Authenticated can insert invitation logs" ON public.invitation_logs;
CREATE POLICY "Professionals can insert own invitation logs"
  ON public.invitation_logs FOR INSERT TO authenticated
  WITH CHECK (professional_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can log 404 telemetry" ON public.route_404_telemetry;
CREATE POLICY "Users can log own 404 telemetry"
  ON public.route_404_telemetry FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated can insert onboarding errors" ON public.onboarding_runtime_errors;
CREATE POLICY "Patients or linked pros can insert onboarding errors"
  ON public.onboarding_runtime_errors FOR INSERT TO authenticated
  WITH CHECK (
    patient_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = onboarding_runtime_errors.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can insert their own trigger logs" ON public.trigger_audit_logs;
CREATE POLICY "Only admins can insert trigger logs"
  ON public.trigger_audit_logs FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated can insert contract violations" ON public.contract_violations_log;
CREATE POLICY "Only admins can insert contract violations"
  ON public.contract_violations_log FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DO $$
DECLARE fn_oid oid;
BEGIN
  FOR fn_oid IN
    SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'select_sovereign_template'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn_oid::regprocedure);
  END LOOP;
END $$;
