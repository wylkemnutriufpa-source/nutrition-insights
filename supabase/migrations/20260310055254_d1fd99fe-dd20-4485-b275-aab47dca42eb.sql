
-- Fix: Allow nutritionists to see profiles and stats of ALL their patients (active + inactive)
-- This prevents inactive patients from losing their name/data in the UI

DROP POLICY "Nutritionists can view patient profiles" ON public.profiles;
CREATE POLICY "Nutritionists can view patient profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM nutritionist_patients np
  WHERE np.patient_id = profiles.user_id
    AND np.nutritionist_id = auth.uid()
));

DROP POLICY "Nutritionists can view patient stats" ON public.player_stats;
CREATE POLICY "Nutritionists can view patient stats"
ON public.player_stats FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM nutritionist_patients np
  WHERE np.patient_id = player_stats.user_id
    AND np.nutritionist_id = auth.uid()
));
