
-- Fix cross-tenant read on clinical experiment tables and meal plan job logs
-- and lock down single_day_sync_logs INSERT

-- 1) clinical_experiment_assignments: scope nutritionist reads to assignments
--    whose experiment was created by them, or whose patient is linked to them.
DROP POLICY IF EXISTS "Authenticated can read experiment assignments" ON public.clinical_experiment_assignments;
CREATE POLICY "Scoped read experiment assignments"
ON public.clinical_experiment_assignments
FOR SELECT
TO authenticated
USING (
  patient_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.clinical_experiments e
    WHERE e.id = clinical_experiment_assignments.experiment_id
      AND e.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = clinical_experiment_assignments.patient_id
      AND np.nutritionist_id = auth.uid()
  )
);

-- 2) clinical_experiment_results: only experiment owner or admin
DROP POLICY IF EXISTS "Authenticated can read experiment results" ON public.clinical_experiment_results;
CREATE POLICY "Scoped read experiment results"
ON public.clinical_experiment_results
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.clinical_experiments e
    WHERE e.id = clinical_experiment_results.experiment_id
      AND e.created_by = auth.uid()
  )
);

-- 3) clinical_experiment_insights
DROP POLICY IF EXISTS "Authenticated can read experiment insights" ON public.clinical_experiment_insights;
CREATE POLICY "Scoped read experiment insights"
ON public.clinical_experiment_insights
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.clinical_experiments e
    WHERE e.id = clinical_experiment_insights.experiment_id
      AND e.created_by = auth.uid()
  )
);

-- 4) clinical_experiment_groups
DROP POLICY IF EXISTS "Authenticated can read experiment groups" ON public.clinical_experiment_groups;
CREATE POLICY "Scoped read experiment groups"
ON public.clinical_experiment_groups
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.clinical_experiments e
    WHERE e.id = clinical_experiment_groups.experiment_id
      AND e.created_by = auth.uid()
  )
);

-- 5) meal_plan_job_dead_letter: nutritionist must own the patient
DROP POLICY IF EXISTS "Admins and nutritionists can view dead letter" ON public.meal_plan_job_dead_letter;
DROP POLICY IF EXISTS "Admins can view dead letter" ON public.meal_plan_job_dead_letter;
DROP POLICY IF EXISTS "Authenticated can view dead letter" ON public.meal_plan_job_dead_letter;
CREATE POLICY "Scoped read meal plan dead letter"
ON public.meal_plan_job_dead_letter
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = meal_plan_job_dead_letter.patient_id
      AND np.nutritionist_id = auth.uid()
  )
);

-- 6) meal_plan_job_audit_logs: nutritionist must own the patient
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.meal_plan_job_audit_logs;
CREATE POLICY "Scoped read meal plan audit logs"
ON public.meal_plan_job_audit_logs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR patient_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = meal_plan_job_audit_logs.patient_id
      AND np.nutritionist_id = auth.uid()
  )
);

-- 7) single_day_sync_logs: restrict INSERT to nutritionist owning the meal plan
DROP POLICY IF EXISTS "System inserts sync logs" ON public.single_day_sync_logs;
CREATE POLICY "Owners insert sync logs"
ON public.single_day_sync_logs
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.meal_plans mp
    WHERE mp.id = single_day_sync_logs.meal_plan_id
      AND (
        mp.nutritionist_id = auth.uid()
        OR mp.patient_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.nutritionist_patients np
          WHERE np.patient_id = mp.patient_id
            AND np.nutritionist_id = auth.uid()
        )
      )
  )
);
