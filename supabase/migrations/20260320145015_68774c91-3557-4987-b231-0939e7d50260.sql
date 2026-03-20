DROP POLICY IF EXISTS "Authenticated can read experiment outcomes" ON public.clinical_experiment_outcomes;

CREATE POLICY "Scoped read experiment outcomes"
  ON public.clinical_experiment_outcomes FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = clinical_experiment_outcomes.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );