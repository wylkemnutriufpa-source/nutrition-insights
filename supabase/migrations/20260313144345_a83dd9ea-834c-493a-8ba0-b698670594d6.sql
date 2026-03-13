
-- FIX 3: patient_plan_features — scope to users with matching plan or professionals/admins
-- The table maps plan_id → feature_key, so scope by user's active prestige plan

-- Drop the open policy (was not dropped in previous migration due to error)
DROP POLICY IF EXISTS "Authenticated read patient_plan_features" ON public.patient_plan_features;

-- Users can view features for their own active plan
CREATE POLICY "Users view own plan features"
ON public.patient_plan_features FOR SELECT TO authenticated
USING (
  plan_id IN (
    SELECT pp.plan_id FROM patient_prestige pp
    WHERE pp.patient_id = auth.uid() AND pp.is_active = true
  )
  OR has_role(auth.uid(), 'nutritionist'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);
