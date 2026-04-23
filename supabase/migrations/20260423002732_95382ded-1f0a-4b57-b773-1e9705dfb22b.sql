-- Fix RLS for meal_recipes to allow Admins and linked Patients
DROP POLICY IF EXISTS "Nutritionists can view own meal_recipes" ON public.meal_recipes;
CREATE POLICY "Nutritionists can view own meal_recipes" 
ON public.meal_recipes FOR SELECT 
USING (
  (auth.uid() = nutritionist_id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  (EXISTS (
    SELECT 1 FROM nutritionist_patients np 
    WHERE np.patient_id = auth.uid() 
    AND np.nutritionist_id = meal_recipes.nutritionist_id
    AND np.status = 'active'
  ))
);

DROP POLICY IF EXISTS "Nutritionists can update own meal_recipes" ON public.meal_recipes;
CREATE POLICY "Nutritionists can update own meal_recipes" 
ON public.meal_recipes FOR UPDATE 
USING ((auth.uid() = nutritionist_id) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Nutritionists can delete own meal_recipes" ON public.meal_recipes;
CREATE POLICY "Nutritionists can delete own meal_recipes" 
ON public.meal_recipes FOR DELETE 
USING ((auth.uid() = nutritionist_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix RLS for marmita_generation_settings
DROP POLICY IF EXISTS "Nutritionist can view own marmita settings" ON public.marmita_generation_settings;
CREATE POLICY "Nutritionist can view own marmita settings" 
ON public.marmita_generation_settings FOR SELECT 
USING ((auth.uid() = nutritionist_id) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Nutritionist can update own marmita settings" ON public.marmita_generation_settings;
CREATE POLICY "Nutritionist can update own marmita settings" 
ON public.marmita_generation_settings FOR UPDATE 
USING ((auth.uid() = nutritionist_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix RLS for meal_plans to allow Admins to see everything including drafts
DROP POLICY IF EXISTS "Nutritionists and patients can view meal plans" ON public.meal_plans;
CREATE POLICY "Nutritionists and patients can view meal plans" 
ON public.meal_plans FOR SELECT 
USING (
  (auth.uid() = patient_id) OR 
  (nutritionist_id = auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "patients_no_drafts" ON public.meal_plans;
CREATE POLICY "patients_no_drafts" 
ON public.meal_plans FOR SELECT 
USING (
  (nutritionist_id = auth.uid()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  ((patient_id = auth.uid()) AND (plan_status <> ALL (ARRAY['draft'::text, 'draft_auto_generated'::text, 'under_professional_review'::text, 'revision_requested'::text])))
);
