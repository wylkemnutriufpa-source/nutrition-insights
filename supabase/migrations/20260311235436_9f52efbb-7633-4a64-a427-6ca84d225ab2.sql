
-- Fix permissive INSERT policy on patient_signals
-- Only nutritionists of the patient or admins can insert signals
DROP POLICY "insert_patient_signals" ON public.patient_signals;
CREATE POLICY "insert_patient_signals" ON public.patient_signals FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = patient_signals.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active')
    OR public.has_role(auth.uid(), 'admin')
  );
