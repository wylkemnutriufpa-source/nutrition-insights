
-- Fix 1: clinical_audit_logs INSERT - restrict to user's own audit entries
DROP POLICY IF EXISTS "Authenticated can insert audit" ON public.clinical_audit_logs;
CREATE POLICY "Authenticated can insert own audit" ON public.clinical_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Fix 2: patient_predicted_outcomes - RLS enabled but no policies
CREATE POLICY "Nutritionists can read patient predictions" ON public.patient_predicted_outcomes
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT np.patient_id FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
    OR patient_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
