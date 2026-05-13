
-- 1) v3_drafts: remove broad tenant ALL policies
DROP POLICY IF EXISTS "Users can access drafts from their tenant" ON public.v3_drafts;
DROP POLICY IF EXISTS "Users can only access drafts from their active tenant" ON public.v3_drafts;

-- 2) affiliate_referrals: drop direct affiliate read; expose non-PII view
DROP POLICY IF EXISTS "Affiliates view own referrals (no email)" ON public.affiliate_referrals;

DROP VIEW IF EXISTS public.affiliate_referrals_safe;
CREATE VIEW public.affiliate_referrals_safe
WITH (security_invoker = on) AS
SELECT ar.id, ar.affiliate_id, ar.referred_user_id, ar.referred_type,
       ar.referral_code_used, ar.referred_plan, ar.status, ar.created_at, ar.converted_at
FROM public.affiliate_referrals ar
WHERE ar.affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
   OR has_role(auth.uid(), 'admin'::app_role);

GRANT SELECT ON public.affiliate_referrals_safe TO authenticated;

-- 3) meal_plan_jobs: block patients from inserting
DROP POLICY IF EXISTS "Patients can insert their own jobs" ON public.meal_plan_jobs;
CREATE POLICY "Nutritionists and admins insert meal plan jobs"
ON public.meal_plan_jobs
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.nutritionist_id = auth.uid() AND np.patient_id = meal_plan_jobs.patient_id
  )
);

-- 4) sovereign_runtime_logs: admins only for client inserts
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.sovereign_runtime_logs;
CREATE POLICY "Admins can insert sovereign runtime logs"
ON public.sovereign_runtime_logs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5) Restrict open INSERTs to authenticated users only
DROP POLICY IF EXISTS "System can insert diagnostics" ON public.invitation_diagnostics;
CREATE POLICY "Authenticated can insert diagnostics"
ON public.invitation_diagnostics
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Service role can insert violations" ON public.contract_violations_log;
CREATE POLICY "Authenticated can insert contract violations"
ON public.contract_violations_log
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can log 404 telemetry" ON public.route_404_telemetry;
CREATE POLICY "Authenticated can log 404 telemetry"
ON public.route_404_telemetry
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 6) job_alert_configs: replace email-domain admin check
DROP POLICY IF EXISTS "Admins only" ON public.job_alert_configs;
CREATE POLICY "Admins only"
ON public.job_alert_configs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
