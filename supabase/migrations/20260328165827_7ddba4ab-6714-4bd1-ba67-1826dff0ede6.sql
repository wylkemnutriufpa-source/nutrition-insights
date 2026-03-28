
-- LOTE 3: Harden RLS — clinical_alerts, automation_rules, automation_runs
-- (behavioral_recovery_actions não tinha fallback OR tenant_id IS NULL)

-- clinical_alerts
DROP POLICY IF EXISTS "Nutritionists can view their alerts" ON public.clinical_alerts;
CREATE POLICY "Nutritionists can view their alerts" ON public.clinical_alerts
  FOR SELECT USING (nutritionist_id = auth.uid() AND tenant_id = get_user_tenant());

DROP POLICY IF EXISTS "Patients can view own alerts" ON public.clinical_alerts;
CREATE POLICY "Patients can view own alerts" ON public.clinical_alerts
  FOR SELECT USING (patient_id = auth.uid() AND tenant_id = get_user_tenant());

DROP POLICY IF EXISTS "Insert alerts for own patients" ON public.clinical_alerts;
CREATE POLICY "Insert alerts for own patients" ON public.clinical_alerts
  FOR INSERT WITH CHECK (
    (nutritionist_id = auth.uid() OR EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.nutritionist_id = clinical_alerts.nutritionist_id
        AND np.patient_id = clinical_alerts.patient_id
        AND np.status = 'active'
    ))
    AND tenant_id = get_user_tenant()
  );

DROP POLICY IF EXISTS "Nutritionists can update their alerts" ON public.clinical_alerts;
CREATE POLICY "Nutritionists can update their alerts" ON public.clinical_alerts
  FOR UPDATE USING (nutritionist_id = auth.uid() AND tenant_id = get_user_tenant())
  WITH CHECK (nutritionist_id = auth.uid() AND tenant_id = get_user_tenant());

-- automation_rules
DROP POLICY IF EXISTS "Nutritionists manage own automation rules" ON public.automation_rules;
CREATE POLICY "Nutritionists manage own automation rules" ON public.automation_rules
  FOR ALL USING (auth.uid() = nutritionist_id AND tenant_id = get_user_tenant())
  WITH CHECK (auth.uid() = nutritionist_id AND tenant_id = get_user_tenant());

-- automation_runs
DROP POLICY IF EXISTS "Nutritionists view own automation runs" ON public.automation_runs;
CREATE POLICY "Nutritionists view own automation runs" ON public.automation_runs
  FOR SELECT USING (auth.uid() = nutritionist_id AND tenant_id = get_user_tenant());

DROP POLICY IF EXISTS "Nutritionists insert own automation runs" ON public.automation_runs;
CREATE POLICY "Nutritionists insert own automation runs" ON public.automation_runs
  FOR INSERT WITH CHECK (auth.uid() = nutritionist_id AND tenant_id = get_user_tenant());

-- LOTE 4: Harden RLS — campaigns
-- (branding_settings e audit_logs não tinham fallback OR tenant_id IS NULL)

-- campaigns
DROP POLICY IF EXISTS "creator_select_own_campaigns" ON public.campaigns;
CREATE POLICY "creator_select_own_campaigns" ON public.campaigns
  FOR SELECT USING (created_by = auth.uid() AND tenant_id = get_user_tenant());

DROP POLICY IF EXISTS "creator_insert_campaigns" ON public.campaigns;
CREATE POLICY "creator_insert_campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (created_by = auth.uid() AND tenant_id = get_user_tenant());

DROP POLICY IF EXISTS "creator_update_campaigns" ON public.campaigns;
CREATE POLICY "creator_update_campaigns" ON public.campaigns
  FOR UPDATE USING (created_by = auth.uid() AND tenant_id = get_user_tenant())
  WITH CHECK (created_by = auth.uid() AND tenant_id = get_user_tenant());

-- Bonus: harden affiliates and clinical_action_recommendations (also had fallback)
DROP POLICY IF EXISTS "Affiliates view own record" ON public.affiliates;
CREATE POLICY "Affiliates view own record" ON public.affiliates
  FOR SELECT USING (user_id = auth.uid() AND tenant_id = get_user_tenant());

DROP POLICY IF EXISTS "Nutritionists manage own action recommendations" ON public.clinical_action_recommendations;
CREATE POLICY "Nutritionists manage own action recommendations" ON public.clinical_action_recommendations
  FOR ALL USING (nutritionist_id = auth.uid() AND tenant_id = get_user_tenant())
  WITH CHECK (nutritionist_id = auth.uid() AND tenant_id = get_user_tenant());
