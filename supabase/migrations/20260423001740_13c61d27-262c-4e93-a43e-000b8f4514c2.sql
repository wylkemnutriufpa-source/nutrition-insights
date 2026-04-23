-- 1. meal_plans: Restrict to owner or patient
DROP POLICY IF EXISTS "Professionals can view tenant patients" ON public.nutritionist_patients;
DROP POLICY IF EXISTS "Nutritionists and patients can view meal plans" ON public.meal_plans;
CREATE POLICY "Nutritionists and patients can view meal plans" ON public.meal_plans
  FOR SELECT USING (
    (auth.uid() = patient_id OR nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Nutritionists can create meal plans" ON public.meal_plans;
CREATE POLICY "Nutritionists can create meal plans" ON public.meal_plans
  FOR INSERT WITH CHECK (
    (nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Nutritionists can update meal plans" ON public.meal_plans;
CREATE POLICY "Nutritionists can update meal plans" ON public.meal_plans
  FOR UPDATE USING (
    (nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Nutritionists can delete meal plans" ON public.meal_plans;
CREATE POLICY "Nutritionists can delete meal plans" ON public.meal_plans
  FOR DELETE USING (
    (nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );

-- 2. meal_plan_items: Align with meal_plans owner check
DROP POLICY IF EXISTS "Users can view meal plan items via plan" ON public.meal_plan_items;
CREATE POLICY "Users can view meal plan items via plan" ON public.meal_plan_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp 
      WHERE mp.id = meal_plan_id 
      AND (auth.uid() = mp.patient_id OR mp.nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "Nutritionists can manage meal plan items" ON public.meal_plan_items;
CREATE POLICY "Nutritionists can manage meal plan items" ON public.meal_plan_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp 
      WHERE mp.id = meal_plan_id 
      AND (mp.nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "Nutritionists can update meal plan items" ON public.meal_plan_items;
CREATE POLICY "Nutritionists can update meal plan items" ON public.meal_plan_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp 
      WHERE mp.id = meal_plan_id 
      AND (mp.nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "Nutritionists can delete meal plan items" ON public.meal_plan_items;
CREATE POLICY "Nutritionists can delete meal plan items" ON public.meal_plan_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp 
      WHERE mp.id = meal_plan_id 
      AND (mp.nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- 3. recipes: Restrict to owner nutritionist
DROP POLICY IF EXISTS "Nutritionists manage tenant recipes" ON public.recipes;
CREATE POLICY "Nutritionists manage own recipes" ON public.recipes
  FOR ALL TO authenticated
  USING (
    (nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    (nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );

-- 4. nutritionist_patients: Restrict to owner nutritionist or patient themselves
DROP POLICY IF EXISTS "Professionals can view tenant patients" ON public.nutritionist_patients;
CREATE POLICY "Nutritionists can view their patients" ON public.nutritionist_patients
  FOR SELECT USING (
    (auth.uid() = patient_id OR auth.uid() = nutritionist_id OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Professionals can insert tenant patients" ON public.nutritionist_patients;
CREATE POLICY "Nutritionists can insert patients" ON public.nutritionist_patients
  FOR INSERT WITH CHECK (
    (auth.uid() = nutritionist_id OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Professionals can update tenant patients" ON public.nutritionist_patients;
CREATE POLICY "Nutritionists can update their patients" ON public.nutritionist_patients
  FOR UPDATE USING (
    (auth.uid() = nutritionist_id OR public.has_role(auth.uid(), 'admin'))
  );

-- 5. clinical_alerts: Restrict to owner nutritionist
DROP POLICY IF EXISTS "Professionals can view tenant alerts" ON public.clinical_alerts;
CREATE POLICY "Nutritionists can view their alerts" ON public.clinical_alerts
  FOR SELECT USING (
    (auth.uid() = patient_id OR nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Professionals can update tenant alerts" ON public.clinical_alerts;
CREATE POLICY "Nutritionists can update their alerts" ON public.clinical_alerts
  FOR UPDATE USING (
    (nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );

-- 6. patient_anamnesis: Restrict via link to nutritionist_patients
DROP POLICY IF EXISTS "Professionals can view tenant anamnesis" ON public.patient_anamnesis;
CREATE POLICY "Nutritionists can view patient anamnesis" ON public.patient_anamnesis
  FOR SELECT USING (
    (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.nutritionist_patients 
      WHERE patient_id = patient_anamnesis.user_id 
      AND (nutritionist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    ))
  );
