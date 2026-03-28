
-- LOTE 1: Harden RLS — Remove OR tenant_id IS NULL
-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid() AND tenant_id = get_user_tenant());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid() AND tenant_id = get_user_tenant())
  WITH CHECK (user_id = auth.uid() AND tenant_id = get_user_tenant());

-- nutritionist_patients
DROP POLICY IF EXISTS "Nutritionists can view their patients" ON public.nutritionist_patients;
CREATE POLICY "Nutritionists can view their patients" ON public.nutritionist_patients
  FOR SELECT USING ((nutritionist_id = auth.uid() OR patient_id = auth.uid()) AND tenant_id = get_user_tenant());

DROP POLICY IF EXISTS "Nutritionists can insert patients" ON public.nutritionist_patients;
CREATE POLICY "Nutritionists can insert patients" ON public.nutritionist_patients
  FOR INSERT WITH CHECK (nutritionist_id = auth.uid() AND tenant_id = get_user_tenant());

DROP POLICY IF EXISTS "Nutritionists can update their patients" ON public.nutritionist_patients;
CREATE POLICY "Nutritionists can update their patients" ON public.nutritionist_patients
  FOR UPDATE USING (nutritionist_id = auth.uid() AND tenant_id = get_user_tenant())
  WITH CHECK (nutritionist_id = auth.uid() AND tenant_id = get_user_tenant());

-- patient_anamnesis
DROP POLICY IF EXISTS "Patients can view own anamnesis" ON public.patient_anamnesis;
CREATE POLICY "Patients can view own anamnesis" ON public.patient_anamnesis
  FOR SELECT USING (user_id = auth.uid() AND tenant_id = get_user_tenant());

DROP POLICY IF EXISTS "Nutritionists can view patient anamnesis" ON public.patient_anamnesis;
CREATE POLICY "Nutritionists can view patient anamnesis" ON public.patient_anamnesis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nutritionist_patients np
      WHERE np.patient_id = patient_anamnesis.user_id
        AND np.nutritionist_id = auth.uid()
        AND np.status = 'active'
    )
    AND tenant_id = get_user_tenant()
  );
