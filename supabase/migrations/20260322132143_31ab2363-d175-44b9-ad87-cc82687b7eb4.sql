
-- ============================================================
-- SECURITY HARDENING MIGRATION
-- ============================================================

-- =============================================
-- 1. MOVE pg_trgm OUT OF PUBLIC SCHEMA
-- =============================================
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- =============================================
-- 2. FIX FUNCTION SEARCH PATH (3 functions)
-- =============================================

-- 2a. activate_meal_plan_ai_guarded
CREATE OR REPLACE FUNCTION public.activate_meal_plan_ai_guarded(
  p_plan_id uuid,
  p_patient_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE meal_plans
  SET plan_status = 'active',
      updated_at = now()
  WHERE id = p_plan_id
    AND patient_id = p_patient_id;
END;
$$;

-- 2b. auto_resolve_onboarding_on_plan_publish
CREATE OR REPLACE FUNCTION public.auto_resolve_onboarding_on_plan_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan_status = 'published_to_patient' AND (OLD.plan_status IS NULL OR OLD.plan_status != 'published_to_patient') THEN
    UPDATE profiles
    SET onboarding_completed = true,
        updated_at = now()
    WHERE id = NEW.patient_id
      AND (onboarding_completed IS NULL OR onboarding_completed = false);
  END IF;
  RETURN NEW;
END;
$$;

-- 2c. notify_lifecycle_change
CREATE OR REPLACE FUNCTION public.notify_lifecycle_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify('lifecycle_changes', json_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'record_id', NEW.id
  )::text);
  RETURN NEW;
END;
$$;

-- =============================================
-- 3. FIX RLS POLICIES — REPLACE USING(true) WITH PROPER CHECKS
-- =============================================

-- 3a. body_assessment_extraction_logs — remove permissive ALL
DROP POLICY IF EXISTS "System manage extraction logs" ON public.body_assessment_extraction_logs;
DROP POLICY IF EXISTS "Professionals read extraction logs" ON public.body_assessment_extraction_logs;

CREATE POLICY "Professionals manage extraction logs"
  ON public.body_assessment_extraction_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = body_assessment_extraction_logs.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = body_assessment_extraction_logs.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

CREATE POLICY "Patients read own extraction logs"
  ON public.body_assessment_extraction_logs FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- 3b. patient_body_assessments — fix ALL policy
DROP POLICY IF EXISTS "Professionals manage body assessments" ON public.patient_body_assessments;

CREATE POLICY "Professionals manage body assessments"
  ON public.patient_body_assessments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_body_assessments.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_body_assessments.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- 3c. patient_clinical_learning_memory — fix ALL policy
DROP POLICY IF EXISTS "service_manage_learning" ON public.patient_clinical_learning_memory;

CREATE POLICY "Professionals manage learning memory"
  ON public.patient_clinical_learning_memory FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_clinical_learning_memory.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_clinical_learning_memory.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- 3d. patient_lab_results — fix ALL policy
DROP POLICY IF EXISTS "Professionals manage lab results" ON public.patient_lab_results;

CREATE POLICY "Professionals manage lab results"
  ON public.patient_lab_results FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_lab_results.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_lab_results.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- 3e. patient_skinfold_assessments — fix ALL policy
DROP POLICY IF EXISTS "Professionals manage skinfolds" ON public.patient_skinfold_assessments;

CREATE POLICY "Professionals manage skinfolds"
  ON public.patient_skinfold_assessments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_skinfold_assessments.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_skinfold_assessments.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

-- 3f. therapeutic_adjustment_history — fix ALL policy
DROP POLICY IF EXISTS "auth_manage_adjustment_history" ON public.therapeutic_adjustment_history;

CREATE POLICY "Professionals manage adjustment history"
  ON public.therapeutic_adjustment_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = therapeutic_adjustment_history.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = therapeutic_adjustment_history.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );

CREATE POLICY "Patients read own adjustment history"
  ON public.therapeutic_adjustment_history FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- =============================================
-- 4. FIX patient_clinical_flags — patients cannot modify
-- =============================================
DROP POLICY IF EXISTS "Service can manage flags" ON public.patient_clinical_flags;

-- Nutritionists can manage flags for their patients
CREATE POLICY "Professionals manage clinical flags"
  ON public.patient_clinical_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_clinical_flags.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_clinical_flags.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
  );
