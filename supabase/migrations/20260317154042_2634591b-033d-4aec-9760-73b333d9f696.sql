
-- Fix permissive INSERT policy on metabolic_phase_history
DROP POLICY IF EXISTS "Service can insert phase history" ON public.metabolic_phase_history;

CREATE POLICY "Authenticated users can insert own phase history"
  ON public.metabolic_phase_history FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = metabolic_phase_history.patient_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
  ));
