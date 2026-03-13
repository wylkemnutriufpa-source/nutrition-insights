
-- Fix overly permissive insert policy
DROP POLICY "Service can insert alerts" ON public.clinical_alerts;

-- Only allow nutritionists to insert alerts for their own patients
CREATE POLICY "Insert alerts for own patients"
  ON public.clinical_alerts FOR INSERT TO authenticated
  WITH CHECK (
    nutritionist_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients np 
      WHERE np.nutritionist_id = clinical_alerts.nutritionist_id 
      AND np.patient_id = clinical_alerts.patient_id 
      AND np.status = 'active'
    )
  );
