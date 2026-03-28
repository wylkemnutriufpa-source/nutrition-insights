
-- ═══════════════════════════════════════════════════════
-- Phase 5 Step 2: Add tenant_id to core RLS policies
-- Strategy: OR tenant_id IS NULL for backward compatibility
-- ═══════════════════════════════════════════════════════

-- ── PROFILES ──
-- Drop existing non-admin policies and recreate with tenant filter
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND (tenant_id = get_user_tenant() OR tenant_id IS NULL))
  WITH CHECK (user_id = auth.uid() AND (tenant_id = get_user_tenant() OR tenant_id IS NULL));

-- ── NUTRITIONIST_PATIENTS ──
DROP POLICY IF EXISTS "Nutritionists can view their patients" ON nutritionist_patients;
CREATE POLICY "Nutritionists can view their patients" ON nutritionist_patients FOR SELECT
  TO authenticated
  USING (
    (nutritionist_id = auth.uid() OR patient_id = auth.uid())
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

DROP POLICY IF EXISTS "Nutritionists can insert patients" ON nutritionist_patients;
CREATE POLICY "Nutritionists can insert patients" ON nutritionist_patients FOR INSERT
  TO authenticated
  WITH CHECK (
    nutritionist_id = auth.uid()
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

DROP POLICY IF EXISTS "Nutritionists can update their patients" ON nutritionist_patients;
CREATE POLICY "Nutritionists can update their patients" ON nutritionist_patients FOR UPDATE
  TO authenticated
  USING (nutritionist_id = auth.uid() AND (tenant_id = get_user_tenant() OR tenant_id IS NULL))
  WITH CHECK (nutritionist_id = auth.uid() AND (tenant_id = get_user_tenant() OR tenant_id IS NULL));

-- ── MEAL_PLANS ──
DROP POLICY IF EXISTS "Nutritionists and patients can view meal plans" ON meal_plans;
CREATE POLICY "Nutritionists and patients can view meal plans" ON meal_plans FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = nutritionist_id OR auth.uid() = patient_id)
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

DROP POLICY IF EXISTS "Nutritionists can create meal plans" ON meal_plans;
CREATE POLICY "Nutritionists can create meal plans" ON meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = nutritionist_id
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

DROP POLICY IF EXISTS "Nutritionists can update meal plans" ON meal_plans;
CREATE POLICY "Nutritionists can update meal plans" ON meal_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = nutritionist_id AND (tenant_id = get_user_tenant() OR tenant_id IS NULL))
  WITH CHECK (auth.uid() = nutritionist_id AND (tenant_id = get_user_tenant() OR tenant_id IS NULL));

-- ── CHECKLIST_TASKS ──
DROP POLICY IF EXISTS "Patients manage own checklist" ON checklist_tasks;
CREATE POLICY "Patients manage own checklist" ON checklist_tasks FOR ALL
  TO authenticated
  USING (auth.uid() = patient_id AND (tenant_id = get_user_tenant() OR tenant_id IS NULL))
  WITH CHECK (auth.uid() = patient_id AND (tenant_id = get_user_tenant() OR tenant_id IS NULL));

DROP POLICY IF EXISTS "Nutritionists view patient checklist" ON checklist_tasks;
CREATE POLICY "Nutritionists view patient checklist" ON checklist_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = checklist_tasks.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

-- ── CLINICAL_ALERTS ──
DROP POLICY IF EXISTS "Nutritionists can view their alerts" ON clinical_alerts;
CREATE POLICY "Nutritionists can view their alerts" ON clinical_alerts FOR SELECT
  TO authenticated
  USING (
    nutritionist_id = auth.uid()
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

DROP POLICY IF EXISTS "Patients can view own alerts" ON clinical_alerts;
CREATE POLICY "Patients can view own alerts" ON clinical_alerts FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid()
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

DROP POLICY IF EXISTS "Insert alerts for own patients" ON clinical_alerts;
CREATE POLICY "Insert alerts for own patients" ON clinical_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    (nutritionist_id = auth.uid() OR EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.nutritionist_id = clinical_alerts.nutritionist_id
        AND np.patient_id = clinical_alerts.patient_id
        AND np.status = 'active'
    ))
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

DROP POLICY IF EXISTS "Nutritionists can update their alerts" ON clinical_alerts;
CREATE POLICY "Nutritionists can update their alerts" ON clinical_alerts FOR UPDATE
  TO authenticated
  USING (nutritionist_id = auth.uid() AND (tenant_id = get_user_tenant() OR tenant_id IS NULL))
  WITH CHECK (nutritionist_id = auth.uid() AND (tenant_id = get_user_tenant() OR tenant_id IS NULL));

-- ── CLINICAL_ACTION_RECOMMENDATIONS ──
DROP POLICY IF EXISTS "Nutritionists manage own action recommendations" ON clinical_action_recommendations;
CREATE POLICY "Nutritionists manage own action recommendations" ON clinical_action_recommendations FOR ALL
  TO authenticated
  USING (nutritionist_id = auth.uid() AND (tenant_id = get_user_tenant() OR tenant_id IS NULL))
  WITH CHECK (nutritionist_id = auth.uid() AND (tenant_id = get_user_tenant() OR tenant_id IS NULL));

-- ── AUTOMATION_RULES ──
DROP POLICY IF EXISTS "Nutritionists manage own automation rules" ON automation_rules;
CREATE POLICY "Nutritionists manage own automation rules" ON automation_rules FOR ALL
  TO authenticated
  USING (auth.uid() = nutritionist_id AND (tenant_id = get_user_tenant() OR tenant_id IS NULL))
  WITH CHECK (auth.uid() = nutritionist_id AND (tenant_id = get_user_tenant() OR tenant_id IS NULL));

-- ── AUTOMATION_RUNS ──
DROP POLICY IF EXISTS "Nutritionists view own automation runs" ON automation_runs;
CREATE POLICY "Nutritionists view own automation runs" ON automation_runs FOR SELECT
  TO authenticated
  USING (
    auth.uid() = nutritionist_id
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

DROP POLICY IF EXISTS "Nutritionists insert own automation runs" ON automation_runs;
CREATE POLICY "Nutritionists insert own automation runs" ON automation_runs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = nutritionist_id
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

-- ── CAMPAIGNS ──
DROP POLICY IF EXISTS "creator_select_own_campaigns" ON campaigns;
CREATE POLICY "creator_select_own_campaigns" ON campaigns FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

DROP POLICY IF EXISTS "creator_insert_campaigns" ON campaigns;
CREATE POLICY "creator_insert_campaigns" ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

DROP POLICY IF EXISTS "creator_update_campaigns" ON campaigns;
CREATE POLICY "creator_update_campaigns" ON campaigns FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND (tenant_id = get_user_tenant() OR tenant_id IS NULL))
  WITH CHECK (created_by = auth.uid() AND (tenant_id = get_user_tenant() OR tenant_id IS NULL));

-- ── AFFILIATES ──
DROP POLICY IF EXISTS "Affiliates view own record" ON affiliates;
CREATE POLICY "Affiliates view own record" ON affiliates FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

-- ── PATIENT_ANAMNESIS ──
DROP POLICY IF EXISTS "Patients can view own anamnesis" ON patient_anamnesis;
CREATE POLICY "Patients can view own anamnesis" ON patient_anamnesis FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );

DROP POLICY IF EXISTS "Nutritionists can view patient anamnesis" ON patient_anamnesis;
CREATE POLICY "Nutritionists can view patient anamnesis" ON patient_anamnesis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_anamnesis.user_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    AND (tenant_id = get_user_tenant() OR tenant_id IS NULL)
  );
