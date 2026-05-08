
-- 1. meal_plans: add is_sharing_enabled flag and tighten sharing policy
ALTER TABLE public.meal_plans ADD COLUMN IF NOT EXISTS is_sharing_enabled boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Anyone with a valid token can view a meal plan" ON public.meal_plans;
CREATE POLICY "Shared meal plans visible with active token"
  ON public.meal_plans
  FOR SELECT
  TO public
  USING (
    is_sharing_enabled = true
    AND sharing_token IS NOT NULL
    AND sharing_expires_at IS NOT NULL
    AND sharing_expires_at > now()
  );

-- 2. meal_plan_item_versions
DROP POLICY IF EXISTS "Users can view versions of items they have access to" ON public.meal_plan_item_versions;
CREATE POLICY "Users can view versions of items they have access to"
  ON public.meal_plan_item_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.meal_plan_items i
      JOIN public.meal_plans mp ON mp.id = i.meal_plan_id
      WHERE i.id = meal_plan_item_versions.meal_plan_item_id
        AND (
          mp.nutritionist_id = auth.uid()
          OR mp.patient_id = auth.uid()
          OR has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

-- 3. meal_clinical_rules: admin-only writes
DROP POLICY IF EXISTS "meal_clinical_rules_all_admin" ON public.meal_clinical_rules;
CREATE POLICY "meal_clinical_rules_admin_write"
  ON public.meal_clinical_rules
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. patient_meal_completions
DROP POLICY IF EXISTS "Users can insert their own completions" ON public.patient_meal_completions;
DROP POLICY IF EXISTS "Users can view their own completions" ON public.patient_meal_completions;

CREATE POLICY "Patients and nutritionists can view completions"
  ON public.patient_meal_completions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.id = patient_meal_completions.nutritionist_patient_id
        AND (np.patient_id = auth.uid() OR np.nutritionist_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Patients can insert their own completions"
  ON public.patient_meal_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.id = patient_meal_completions.nutritionist_patient_id
        AND np.patient_id = auth.uid()
    )
  );

CREATE POLICY "Patients can delete their own completions"
  ON public.patient_meal_completions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutritionist_patients np
      WHERE np.id = patient_meal_completions.nutritionist_patient_id
        AND np.patient_id = auth.uid()
    )
  );

-- 5. state_consistency_logs
DROP POLICY IF EXISTS "Allow system to insert consistency logs" ON public.state_consistency_logs;
CREATE POLICY "Authenticated users insert their own consistency logs"
  ON public.state_consistency_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. access_logs
DROP POLICY IF EXISTS "Admins can view all access logs" ON public.access_logs;
CREATE POLICY "Admins can view all access logs"
  ON public.access_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. clinical_plan_audit_logs
DROP POLICY IF EXISTS "Profissionais podem ver logs de auditoria" ON public.clinical_plan_audit_logs;
CREATE POLICY "Admins can view clinical plan audit logs"
  ON public.clinical_plan_audit_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. profiles & invitations
DROP POLICY IF EXISTS "Public can view professional info via invitation" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view invitations by code" ON public.invitations;
DROP POLICY IF EXISTS "Public can update invitation status" ON public.invitations;

CREATE OR REPLACE FUNCTION public.get_invitation_by_code(_code text)
RETURNS TABLE (
  id uuid,
  code text,
  professional_id uuid,
  status text,
  expires_at timestamptz,
  patient_email text,
  patient_name text,
  professional_full_name text,
  professional_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    i.code,
    i.professional_id,
    i.status,
    i.expires_at,
    i.patient_email,
    i.patient_name,
    p.full_name AS professional_full_name,
    p.avatar_url AS professional_avatar_url
  FROM public.invitations i
  LEFT JOIN public.profiles p ON p.user_id = i.professional_id
  WHERE i.code = _code
    AND i.status IN ('pending', 'viewed')
    AND (i.expires_at IS NULL OR i.expires_at > now());
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_code(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_invitation_viewed(_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.invitations
  SET status = 'viewed', updated_at = now()
  WHERE code = _code
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());
$$;

GRANT EXECUTE ON FUNCTION public.mark_invitation_viewed(text) TO anon, authenticated;
