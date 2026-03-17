
-- ============================================================
-- RLS HARDENING V2: Scope all policies to nutritionist_patients
-- Eliminates cross-tenant data leakage
-- ============================================================

-- 1. patient_nutrition_benchmarks: SELECT true → owner or linked nutritionist
DROP POLICY IF EXISTS "Authenticated users can read benchmarks" ON public.patient_nutrition_benchmarks;
DROP POLICY IF EXISTS "Anyone can read benchmarks" ON public.patient_nutrition_benchmarks;
CREATE POLICY "Owner or linked professional can read benchmarks"
  ON public.patient_nutrition_benchmarks FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_nutrition_benchmarks.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 2. metabolic_classification_history: scope SELECT + INSERT to linked nutritionist
DROP POLICY IF EXISTS "Owner or professionals can view metabolic classification history" ON public.metabolic_classification_history;
DROP POLICY IF EXISTS "Nutritionists can insert metabolic classification" ON public.metabolic_classification_history;
DROP POLICY IF EXISTS "Professionals can insert metabolic classification" ON public.metabolic_classification_history;

CREATE POLICY "Owner or linked professional can view metabolic history"
  ON public.metabolic_classification_history FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = metabolic_classification_history.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Linked professional can insert metabolic classification"
  ON public.metabolic_classification_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = metabolic_classification_history.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. patient_automation_state: scope to linked nutritionist
DROP POLICY IF EXISTS "Professionals and owners can read automation state" ON public.patient_automation_state;

CREATE POLICY "Owner or linked professional can read automation state"
  ON public.patient_automation_state FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_automation_state.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. clinical_auto_adjustment_logs: scope to linked nutritionist
DROP POLICY IF EXISTS "Professionals can read auto adjustment logs" ON public.clinical_auto_adjustment_logs;

CREATE POLICY "Linked professional can read auto adjustment logs"
  ON public.clinical_auto_adjustment_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = clinical_auto_adjustment_logs.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 5. nutrition_protocol_changed: scope to linked nutritionist
DROP POLICY IF EXISTS "Professionals can read nutrition_protocol_changed" ON public.nutrition_protocol_changed;

CREATE POLICY "Linked professional can read protocol changes"
  ON public.nutrition_protocol_changed FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = nutrition_protocol_changed.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 6. clinical_intervention_simulations: scope to linked nutritionist or creator
DROP POLICY IF EXISTS "Professionals can read simulations" ON public.clinical_intervention_simulations;

CREATE POLICY "Creator or linked professional can read simulations"
  ON public.clinical_intervention_simulations FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = clinical_intervention_simulations.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 7. pipeline_runs + pipeline_step_results: restrict to admin only
DROP POLICY IF EXISTS "Authenticated users can read pipeline runs" ON public.pipeline_runs;
DROP POLICY IF EXISTS "Anyone can read pipeline runs" ON public.pipeline_runs;
CREATE POLICY "Only admins can read pipeline runs"
  ON public.pipeline_runs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can read pipeline step results" ON public.pipeline_step_results;
DROP POLICY IF EXISTS "Anyone can read pipeline step results" ON public.pipeline_step_results;
CREATE POLICY "Only admins can read pipeline step results"
  ON public.pipeline_step_results FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. clinic_clinical_evolution_metrics: restrict to owner nutritionist or admin
DROP POLICY IF EXISTS "Authenticated users can read clinic metrics" ON public.clinic_clinical_evolution_metrics;
DROP POLICY IF EXISTS "Anyone can read clinic evolution metrics" ON public.clinic_clinical_evolution_metrics;
CREATE POLICY "Owner nutritionist or admin can read clinic metrics"
  ON public.clinic_clinical_evolution_metrics FOR SELECT TO authenticated
  USING (
    nutritionist_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 9. clinical_experiment_* tables: scope ALL operations to experiment creator or admin
-- Groups
DROP POLICY IF EXISTS "Nutritionists can manage experiment groups" ON public.clinical_experiment_groups;
CREATE POLICY "Creator or admin can manage experiment groups"
  ON public.clinical_experiment_groups FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinical_experiments ce
      WHERE ce.id = clinical_experiment_groups.experiment_id
        AND (ce.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinical_experiments ce
      WHERE ce.id = clinical_experiment_groups.experiment_id
        AND (ce.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Outcomes
DROP POLICY IF EXISTS "Nutritionists can manage experiment outcomes" ON public.clinical_experiment_outcomes;
CREATE POLICY "Creator or admin can manage experiment outcomes"
  ON public.clinical_experiment_outcomes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinical_experiments ce
      WHERE ce.id = clinical_experiment_outcomes.experiment_id
        AND (ce.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinical_experiments ce
      WHERE ce.id = clinical_experiment_outcomes.experiment_id
        AND (ce.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Results
DROP POLICY IF EXISTS "Nutritionists can manage experiment results" ON public.clinical_experiment_results;
CREATE POLICY "Creator or admin can manage experiment results"
  ON public.clinical_experiment_results FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinical_experiments ce
      WHERE ce.id = clinical_experiment_results.experiment_id
        AND (ce.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinical_experiments ce
      WHERE ce.id = clinical_experiment_results.experiment_id
        AND (ce.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Insights
DROP POLICY IF EXISTS "Nutritionists can manage experiment insights" ON public.clinical_experiment_insights;
CREATE POLICY "Creator or admin can manage experiment insights"
  ON public.clinical_experiment_insights FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinical_experiments ce
      WHERE ce.id = clinical_experiment_insights.experiment_id
        AND (ce.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinical_experiments ce
      WHERE ce.id = clinical_experiment_insights.experiment_id
        AND (ce.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Assignments
DROP POLICY IF EXISTS "Nutritionists can manage experiment assignments" ON public.clinical_experiment_assignments;
CREATE POLICY "Creator or admin can manage experiment assignments"
  ON public.clinical_experiment_assignments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clinical_experiments ce
      WHERE ce.id = clinical_experiment_assignments.experiment_id
        AND (ce.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinical_experiments ce
      WHERE ce.id = clinical_experiment_assignments.experiment_id
        AND (ce.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );
