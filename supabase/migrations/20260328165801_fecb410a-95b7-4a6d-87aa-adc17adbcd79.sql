
-- LOTE 2: Harden RLS — meal_plans, checklist_tasks
-- (chat_messages e notifications não tinham fallback OR tenant_id IS NULL)

-- meal_plans
DROP POLICY IF EXISTS "Nutritionists and patients can view meal plans" ON public.meal_plans;
CREATE POLICY "Nutritionists and patients can view meal plans" ON public.meal_plans
  FOR SELECT USING ((auth.uid() = nutritionist_id OR auth.uid() = patient_id) AND tenant_id = get_user_tenant());

DROP POLICY IF EXISTS "Nutritionists can create meal plans" ON public.meal_plans;
CREATE POLICY "Nutritionists can create meal plans" ON public.meal_plans
  FOR INSERT WITH CHECK (auth.uid() = nutritionist_id AND tenant_id = get_user_tenant());

DROP POLICY IF EXISTS "Nutritionists can update meal plans" ON public.meal_plans;
CREATE POLICY "Nutritionists can update meal plans" ON public.meal_plans
  FOR UPDATE USING (auth.uid() = nutritionist_id AND tenant_id = get_user_tenant())
  WITH CHECK (auth.uid() = nutritionist_id AND tenant_id = get_user_tenant());

-- checklist_tasks
DROP POLICY IF EXISTS "Patients manage own checklist" ON public.checklist_tasks;
CREATE POLICY "Patients manage own checklist" ON public.checklist_tasks
  FOR ALL USING (auth.uid() = patient_id AND tenant_id = get_user_tenant())
  WITH CHECK (auth.uid() = patient_id AND tenant_id = get_user_tenant());

DROP POLICY IF EXISTS "Nutritionists view patient checklist" ON public.checklist_tasks;
CREATE POLICY "Nutritionists view patient checklist" ON public.checklist_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = checklist_tasks.patient_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    AND tenant_id = get_user_tenant()
  );
