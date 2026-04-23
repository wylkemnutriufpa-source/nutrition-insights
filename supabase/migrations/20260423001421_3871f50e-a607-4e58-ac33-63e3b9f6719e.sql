-- 1. meal_plans: Allow any nutritionist in the same tenant
DROP POLICY IF EXISTS "Nutritionists and patients can view meal plans" ON public.meal_plans;
CREATE POLICY "Nutritionists and patients can view meal plans" ON public.meal_plans
  FOR SELECT USING (
    (auth.uid() = patient_id OR public.has_role(auth.uid(), 'nutritionist'))
    AND tenant_id = public.get_user_tenant()
  );

DROP POLICY IF EXISTS "Nutritionists can create meal plans" ON public.meal_plans;
CREATE POLICY "Nutritionists can create meal plans" ON public.meal_plans
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'nutritionist')
    AND tenant_id = public.get_user_tenant()
  );

DROP POLICY IF EXISTS "Nutritionists can update meal plans" ON public.meal_plans;
CREATE POLICY "Nutritionists can update meal plans" ON public.meal_plans
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'nutritionist')
    AND tenant_id = public.get_user_tenant()
  );

DROP POLICY IF EXISTS "Nutritionists can delete meal plans" ON public.meal_plans;
CREATE POLICY "Nutritionists can delete meal plans" ON public.meal_plans
  FOR DELETE USING (
    public.has_role(auth.uid(), 'nutritionist')
    AND tenant_id = public.get_user_tenant()
  );

-- 2. meal_plan_items: Align with meal_plans
DROP POLICY IF EXISTS "Users can view meal plan items via plan" ON public.meal_plan_items;
CREATE POLICY "Users can view meal plan items via plan" ON public.meal_plan_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp 
      WHERE mp.id = meal_plan_id 
      AND (auth.uid() = mp.patient_id OR public.has_role(auth.uid(), 'nutritionist'))
      AND mp.tenant_id = public.get_user_tenant()
    )
  );

DROP POLICY IF EXISTS "Nutritionists can manage meal plan items" ON public.meal_plan_items;
CREATE POLICY "Nutritionists can manage meal plan items" ON public.meal_plan_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp 
      WHERE mp.id = meal_plan_id 
      AND public.has_role(auth.uid(), 'nutritionist')
      AND mp.tenant_id = public.get_user_tenant()
    )
  );

DROP POLICY IF EXISTS "Nutritionists can update meal plan items" ON public.meal_plan_items;
CREATE POLICY "Nutritionists can update meal plan items" ON public.meal_plan_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp 
      WHERE mp.id = meal_plan_id 
      AND public.has_role(auth.uid(), 'nutritionist')
      AND mp.tenant_id = public.get_user_tenant()
    )
  );

DROP POLICY IF EXISTS "Nutritionists can delete meal plan items" ON public.meal_plan_items;
CREATE POLICY "Nutritionists can delete meal plan items" ON public.meal_plan_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meal_plans mp 
      WHERE mp.id = meal_plan_id 
      AND public.has_role(auth.uid(), 'nutritionist')
      AND mp.tenant_id = public.get_user_tenant()
    )
  );

-- 3. recipes: Allow any nutritionist in the same tenant
DROP POLICY IF EXISTS "Nutritionists manage own recipes" ON public.recipes;
CREATE POLICY "Nutritionists manage tenant recipes" ON public.recipes
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'nutritionist') 
    AND (tenant_id = public.get_user_tenant() OR tenant_id IS NULL)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'nutritionist') 
    AND tenant_id = public.get_user_tenant()
  );

-- 4. nutritionist_patients: Allow any nutritionist in tenant to see and manage patients
DROP POLICY IF EXISTS "Nutritionists can view their patients" ON public.nutritionist_patients;
CREATE POLICY "Professionals can view tenant patients" ON public.nutritionist_patients
  FOR SELECT USING (
    (auth.uid() = patient_id OR public.has_role(auth.uid(), 'nutritionist'))
    AND tenant_id = public.get_user_tenant()
  );

DROP POLICY IF EXISTS "Nutritionists can insert patients" ON public.nutritionist_patients;
CREATE POLICY "Professionals can insert tenant patients" ON public.nutritionist_patients
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'nutritionist')
    AND tenant_id = public.get_user_tenant()
  );

DROP POLICY IF EXISTS "Nutritionists can update their patients" ON public.nutritionist_patients;
CREATE POLICY "Professionals can update tenant patients" ON public.nutritionist_patients
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'nutritionist')
    AND tenant_id = public.get_user_tenant()
  );

-- 5. clinical_alerts: Allow any nutritionist in tenant
DROP POLICY IF EXISTS "Nutritionists can view their alerts" ON public.clinical_alerts;
CREATE POLICY "Professionals can view tenant alerts" ON public.clinical_alerts
  FOR SELECT USING (
    (auth.uid() = patient_id OR public.has_role(auth.uid(), 'nutritionist'))
    AND tenant_id = public.get_user_tenant()
  );

DROP POLICY IF EXISTS "Nutritionists can update their alerts" ON public.clinical_alerts;
CREATE POLICY "Professionals can update tenant alerts" ON public.clinical_alerts
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'nutritionist')
    AND tenant_id = public.get_user_tenant()
  );

-- 6. patient_anamnesis: Allow any nutritionist in tenant
DROP POLICY IF EXISTS "Nutritionists can view patient anamnesis" ON public.patient_anamnesis;
CREATE POLICY "Professionals can view tenant anamnesis" ON public.patient_anamnesis
  FOR SELECT USING (
    (user_id = auth.uid() OR public.has_role(auth.uid(), 'nutritionist'))
    AND tenant_id = public.get_user_tenant()
  );
