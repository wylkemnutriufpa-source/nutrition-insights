-- Fix RLS policies for meal_recipes to allow admins full access
ALTER TABLE public.meal_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Nutritionists can create meal_recipes" ON public.meal_recipes;
CREATE POLICY "Nutritionists and admins can create meal_recipes" 
ON public.meal_recipes 
FOR INSERT 
WITH CHECK (auth.uid() = nutritionist_id OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Nutritionists can update own meal_recipes" ON public.meal_recipes;
CREATE POLICY "Nutritionists and admins can update meal_recipes" 
ON public.meal_recipes 
FOR UPDATE 
USING (auth.uid() = nutritionist_id OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Nutritionists can delete own meal_recipes" ON public.meal_recipes;
CREATE POLICY "Nutritionists and admins can delete meal_recipes" 
ON public.meal_recipes 
FOR DELETE 
USING (auth.uid() = nutritionist_id OR has_role(auth.uid(), 'admin'::app_role));

-- Fix patient_anamnesis policies for admins
DROP POLICY IF EXISTS "Nutritionists can insert patient anamnesis" ON public.patient_anamnesis;
CREATE POLICY "Nutritionists and admins can insert patient anamnesis" 
ON public.patient_anamnesis 
FOR INSERT 
WITH CHECK (
  (EXISTS ( SELECT 1 FROM nutritionist_patients np WHERE np.patient_id = patient_anamnesis.user_id AND np.nutritionist_id = auth.uid() AND np.status = 'active' ))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Nutritionists can update patient anamnesis" ON public.patient_anamnesis;
CREATE POLICY "Nutritionists and admins can update patient anamnesis" 
ON public.patient_anamnesis 
FOR UPDATE 
USING (
  (EXISTS ( SELECT 1 FROM nutritionist_patients np WHERE np.patient_id = patient_anamnesis.user_id AND np.nutritionist_id = auth.uid() AND np.status = 'active' ))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix meal_visual_library policies for admins
DROP POLICY IF EXISTS "Nutritionists can insert visual library items" ON public.meal_visual_library;
CREATE POLICY "Nutritionists and admins can insert visual library items" 
ON public.meal_visual_library 
FOR INSERT 
WITH CHECK (tenant_id = get_user_tenant() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Nutritionists can update their visual library items" ON public.meal_visual_library;
CREATE POLICY "Nutritionists and admins can update visual library items" 
ON public.meal_visual_library 
FOR UPDATE 
USING (tenant_id = get_user_tenant() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Nutritionists can delete their visual library items" ON public.meal_visual_library;
CREATE POLICY "Nutritionists and admins can delete visual library items" 
ON public.meal_visual_library 
FOR DELETE 
USING (tenant_id = get_user_tenant() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can read global visual library items" ON public.meal_visual_library;
CREATE POLICY "Authenticated users and admins can read visual library items" 
ON public.meal_visual_library 
FOR SELECT 
USING (tenant_id IS NULL OR tenant_id = get_user_tenant() OR has_role(auth.uid(), 'admin'::app_role));
