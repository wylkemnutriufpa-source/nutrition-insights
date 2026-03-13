
-- Fix profiles policy: require active status for nutritionist access
DROP POLICY IF EXISTS "Nutritionists can view patient profiles" ON public.profiles;
CREATE POLICY "Nutritionists can view patient profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = profiles.user_id
      AND np.nutritionist_id = auth.uid()
      AND np.status = 'active'
    )
  );
