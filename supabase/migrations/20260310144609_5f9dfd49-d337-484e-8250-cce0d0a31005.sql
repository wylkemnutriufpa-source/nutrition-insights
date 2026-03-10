
-- Allow nutritionists to delete prestige assignments for their patients
CREATE POLICY "Nutritionists delete patient prestige" ON public.patient_prestige
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_prestige.patient_id
      AND np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
  );

-- Allow nutritionists to update patient prestige
CREATE POLICY "Nutritionists update patient prestige" ON public.patient_prestige
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.patient_id = patient_prestige.patient_id
      AND np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
  );
