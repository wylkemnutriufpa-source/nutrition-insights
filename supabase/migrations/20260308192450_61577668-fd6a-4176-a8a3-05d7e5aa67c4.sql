
-- Fix: Allow authenticated users to insert their own role during signup
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fix: Allow nutritionists to view patient profiles (needed for dashboard)
CREATE POLICY "Nutritionists can view patient profiles" ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.patient_id = profiles.user_id AND np.nutritionist_id = auth.uid() AND np.status = 'active'
  ));
