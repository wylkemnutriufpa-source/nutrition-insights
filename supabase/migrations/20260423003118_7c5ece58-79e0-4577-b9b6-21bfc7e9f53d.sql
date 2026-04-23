-- Add Admin bypass to patient_timeline
DROP POLICY IF EXISTS "Nutritionists manage patient timeline" ON public.patient_timeline;
CREATE POLICY "Nutritionists manage patient timeline" 
ON public.patient_timeline FOR ALL 
USING (
  (EXISTS (
    SELECT 1 FROM nutritionist_patients np 
    WHERE np.patient_id = patient_timeline.patient_id 
    AND np.nutritionist_id = auth.uid() 
    AND np.status = 'active'
  )) OR 
  has_role(auth.uid(), 'admin'::app_role)
);
