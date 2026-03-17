
-- =====================================================
-- FIX 1: Drop dangerous {public} "Full access" policies
-- These allow unauthenticated users to read/write clinical data!
-- =====================================================

DROP POLICY IF EXISTS "Full access clinical_experiment_assignments" ON public.clinical_experiment_assignments;
DROP POLICY IF EXISTS "Full access clinical_experiment_groups" ON public.clinical_experiment_groups;
DROP POLICY IF EXISTS "Full access clinical_experiment_insights" ON public.clinical_experiment_insights;
DROP POLICY IF EXISTS "Full access clinical_experiment_outcomes" ON public.clinical_experiment_outcomes;
DROP POLICY IF EXISTS "Full access clinical_experiment_results" ON public.clinical_experiment_results;
DROP POLICY IF EXISTS "Full access clinical_experiments" ON public.clinical_experiments;
DROP POLICY IF EXISTS "Service role full access on clinical_intervention_simulations" ON public.clinical_intervention_simulations;

-- Replace with proper authenticated policies

-- clinical_experiments: only creator, org members, or admins
CREATE POLICY "Authenticated can read experiments" ON public.clinical_experiments
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR (organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id))
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'nutritionist')
  );

CREATE POLICY "Nutritionists can manage experiments" ON public.clinical_experiments
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'nutritionist')
    OR public.has_role(auth.uid(), 'admin')
  );

-- clinical_experiment_groups
CREATE POLICY "Authenticated can read experiment groups" ON public.clinical_experiment_groups
  FOR SELECT TO authenticated
  USING (
    experiment_id IN (
      SELECT id FROM public.clinical_experiments
      WHERE created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'nutritionist')
    )
  );

CREATE POLICY "Nutritionists can manage experiment groups" ON public.clinical_experiment_groups
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'));

-- clinical_experiment_assignments
CREATE POLICY "Authenticated can read experiment assignments" ON public.clinical_experiment_assignments
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR public.has_role(auth.uid(), 'nutritionist')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Nutritionists can manage experiment assignments" ON public.clinical_experiment_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'));

-- clinical_experiment_outcomes
CREATE POLICY "Authenticated can read experiment outcomes" ON public.clinical_experiment_outcomes
  FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR public.has_role(auth.uid(), 'nutritionist')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Nutritionists can manage experiment outcomes" ON public.clinical_experiment_outcomes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'));

-- clinical_experiment_results
CREATE POLICY "Authenticated can read experiment results" ON public.clinical_experiment_results
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'nutritionist')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Nutritionists can manage experiment results" ON public.clinical_experiment_results
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'));

-- clinical_experiment_insights
CREATE POLICY "Authenticated can read experiment insights" ON public.clinical_experiment_insights
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'nutritionist')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Nutritionists can manage experiment insights" ON public.clinical_experiment_insights
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'nutritionist') OR public.has_role(auth.uid(), 'admin'));

-- clinical_intervention_simulations
CREATE POLICY "Authenticated can read simulations" ON public.clinical_intervention_simulations
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'nutritionist')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Nutritionists can manage simulations" ON public.clinical_intervention_simulations
  FOR ALL TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'nutritionist')
    OR public.has_role(auth.uid(), 'admin')
  );

-- =====================================================
-- FIX 2: Drop redundant service_role policies
-- service_role already bypasses RLS, these are noise
-- =====================================================

DROP POLICY IF EXISTS "Service role can manage clinic_clinical_evolution_metrics" ON public.clinic_clinical_evolution_metrics;
DROP POLICY IF EXISTS "Service role can manage auto adjustment logs" ON public.clinical_auto_adjustment_logs;
DROP POLICY IF EXISTS "service_manage_snapshots" ON public.clinical_daily_snapshots;
DROP POLICY IF EXISTS "Service role can manage cluster_protocol_matrix" ON public.cluster_protocol_matrix;
DROP POLICY IF EXISTS "Service role can manage operational alerts" ON public.organization_operational_alerts;
DROP POLICY IF EXISTS "Service role can manage operational snapshots" ON public.organization_operational_snapshots;
DROP POLICY IF EXISTS "Service role can manage recommended actions" ON public.organization_recommended_actions;
DROP POLICY IF EXISTS "Service role can manage automation state" ON public.patient_automation_state;
DROP POLICY IF EXISTS "Service role full access on patient_body_projection_states" ON public.patient_body_projection_states;
DROP POLICY IF EXISTS "Service role full access on patient_predicted_outcomes" ON public.patient_predicted_outcomes;
DROP POLICY IF EXISTS "Service role full access on patient_weight_dynamics" ON public.patient_weight_dynamics;
DROP POLICY IF EXISTS "Service role full access on patient_weight_history" ON public.patient_weight_history;
DROP POLICY IF EXISTS "Service role full access on patient_weight_projection" ON public.patient_weight_projection;
DROP POLICY IF EXISTS "service_manage_pipeline_runs" ON public.pipeline_runs;
DROP POLICY IF EXISTS "service_manage_step_results" ON public.pipeline_step_results;
DROP POLICY IF EXISTS "Service role can manage professional metrics" ON public.professional_operational_metrics;

-- =====================================================
-- FIX 3: Add policies to tables with RLS but no policies
-- =====================================================

-- program_enrollments
CREATE POLICY "Patients can view own enrollments" ON public.program_enrollments
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Professionals can view their enrollments" ON public.program_enrollments
  FOR SELECT TO authenticated
  USING (
    professional_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Professionals can manage enrollments" ON public.program_enrollments
  FOR ALL TO authenticated
  USING (
    professional_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'nutritionist')
    OR public.has_role(auth.uid(), 'admin')
  );

-- protocol_cycles
CREATE POLICY "Professionals can manage protocol cycles" ON public.protocol_cycles
  FOR ALL TO authenticated
  USING (
    enrollment_id IN (
      SELECT id FROM public.program_enrollments
      WHERE professional_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'nutritionist')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Patients can view own protocol cycles" ON public.protocol_cycles
  FOR SELECT TO authenticated
  USING (
    enrollment_id IN (
      SELECT id FROM public.program_enrollments
      WHERE patient_id = auth.uid()
    )
  );
