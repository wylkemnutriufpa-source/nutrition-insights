
-- Allow nutritionists to insert anamnesis for their patients
CREATE POLICY "Nutritionists can insert patient anamnesis"
ON public.patient_anamnesis
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = patient_anamnesis.user_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  )
);

-- Allow nutritionists to update patient anamnesis
CREATE POLICY "Nutritionists can update patient anamnesis"
ON public.patient_anamnesis
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = patient_anamnesis.user_id
    AND np.nutritionist_id = auth.uid()
    AND np.status = 'active'
  )
);
