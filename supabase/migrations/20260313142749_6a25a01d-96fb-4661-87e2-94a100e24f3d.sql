
-- =============================================================
-- SECURITY HARDENING: Fix all RLS policy vulnerabilities
-- =============================================================

-- 1. FIX BOOKING_PAYMENTS: Remove clause that lets patients see other patients' data
DROP POLICY IF EXISTS "Nutritionists can view their booking payments" ON public.booking_payments;
CREATE POLICY "Nutritionists can view their booking payments"
  ON public.booking_payments FOR SELECT TO authenticated
  USING (
    nutritionist_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 2. FIX RANKING_SNAPSHOTS: Restrict from "true" to scoped access
DROP POLICY IF EXISTS "Authenticated can view ranking snapshots" ON public.ranking_snapshots;
CREATE POLICY "Users can view own ranking snapshots"
  ON public.ranking_snapshots FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = ranking_snapshots.patient_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. FIX PATIENT_RANKING_CACHE: Restrict from "true" to scoped access  
DROP POLICY IF EXISTS "Authenticated can view ranking" ON public.patient_ranking_cache;
CREATE POLICY "Users can view ranking of own scope"
  ON public.patient_ranking_cache FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_ranking_cache.patient_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. FIX ANON-ROLE POLICIES: Move from public to authenticated

-- affiliate_metrics_cache
DROP POLICY IF EXISTS "Admins can manage affiliate metrics" ON public.affiliate_metrics_cache;
CREATE POLICY "Admins can manage affiliate metrics"
  ON public.affiliate_metrics_cache FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all affiliate metrics" ON public.affiliate_metrics_cache;
CREATE POLICY "Admins can view all affiliate metrics"
  ON public.affiliate_metrics_cache FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view own affiliate metrics" ON public.affiliate_metrics_cache;
CREATE POLICY "Users can view own affiliate metrics"
  ON public.affiliate_metrics_cache FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- affiliate_risk_flags
DROP POLICY IF EXISTS "Admins can manage risk flags" ON public.affiliate_risk_flags;
CREATE POLICY "Admins can manage risk flags"
  ON public.affiliate_risk_flags FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- automation_rules
DROP POLICY IF EXISTS "Nutritionists manage own automation rules" ON public.automation_rules;
CREATE POLICY "Nutritionists manage own automation rules"
  ON public.automation_rules FOR ALL TO authenticated
  USING (auth.uid() = nutritionist_id)
  WITH CHECK (auth.uid() = nutritionist_id);

-- automation_runs
DROP POLICY IF EXISTS "Nutritionists insert own automation runs" ON public.automation_runs;
CREATE POLICY "Nutritionists insert own automation runs"
  ON public.automation_runs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = nutritionist_id);

DROP POLICY IF EXISTS "Nutritionists view own automation runs" ON public.automation_runs;
CREATE POLICY "Nutritionists view own automation runs"
  ON public.automation_runs FOR SELECT TO authenticated
  USING (auth.uid() = nutritionist_id);

-- financial_transactions
DROP POLICY IF EXISTS "Nutritionists manage own financial transactions" ON public.financial_transactions;
CREATE POLICY "Nutritionists manage own financial transactions"
  ON public.financial_transactions FOR ALL TO authenticated
  USING (auth.uid() = nutritionist_id)
  WITH CHECK (auth.uid() = nutritionist_id);

-- payments
DROP POLICY IF EXISTS "Admins manage payments" ON public.payments;
CREATE POLICY "Admins manage payments"
  ON public.payments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users insert own payments" ON public.payments;
CREATE POLICY "Users insert own payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
CREATE POLICY "Users view own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- push_subscriptions
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- professional_feature_usage
DROP POLICY IF EXISTS "Admins manage feature flags" ON public.professional_feature_usage;
CREATE POLICY "Admins manage feature flags"
  ON public.professional_feature_usage FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Nutritionists view own features" ON public.professional_feature_usage;
CREATE POLICY "Nutritionists view own features"
  ON public.professional_feature_usage FOR SELECT TO authenticated
  USING (auth.uid() = nutritionist_id);

-- subscriptions
DROP POLICY IF EXISTS "Admins manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins manage all subscriptions"
  ON public.subscriptions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users view own subscription" ON public.subscriptions;
CREATE POLICY "Users view own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- patient_supplements
DROP POLICY IF EXISTS "Nutritionists manage patient supplements" ON public.patient_supplements;
CREATE POLICY "Nutritionists manage patient supplements"
  ON public.patient_supplements FOR ALL TO authenticated
  USING (auth.uid() = nutritionist_id)
  WITH CHECK (auth.uid() = nutritionist_id);

DROP POLICY IF EXISTS "Patients view own supplements" ON public.patient_supplements;
CREATE POLICY "Patients view own supplements"
  ON public.patient_supplements FOR SELECT TO authenticated
  USING (auth.uid() = patient_id);

-- testimonials (keep anon for approved public view, but fix other policies)
DROP POLICY IF EXISTS "Admins manage all testimonials" ON public.testimonials;
CREATE POLICY "Admins manage all testimonials"
  ON public.testimonials FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Nutritionists view their testimonials" ON public.testimonials;
CREATE POLICY "Nutritionists view their testimonials"
  ON public.testimonials FOR SELECT TO authenticated
  USING (auth.uid() = nutritionist_id);

DROP POLICY IF EXISTS "Patients manage own testimonials" ON public.testimonials;
CREATE POLICY "Patients manage own testimonials"
  ON public.testimonials FOR ALL TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);
