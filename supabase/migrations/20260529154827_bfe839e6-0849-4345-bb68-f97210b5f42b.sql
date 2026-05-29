
-- 1) Remove broad public policy on professional_profiles (table) — keep public access via the dedicated 'professional_profiles_public' view
DROP POLICY IF EXISTS "Public can view professional_profiles" ON public.professional_profiles;

-- 2) Restrict 'profiles' SELECT for professionals: only own profile, linked nutritionist/patient, or admin
DROP POLICY IF EXISTS "Authenticated can view professional profiles" ON public.profiles;

-- 3) Fix system_incident_logs admin policy (was ALL/true)
DROP POLICY IF EXISTS "Admins can manage incident logs" ON public.system_incident_logs;
CREATE POLICY "Admins can manage incident logs"
  ON public.system_incident_logs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) workspace_sections — block anonymous sessions explicitly
DROP POLICY IF EXISTS "Users manage own sections" ON public.workspace_sections;
CREATE POLICY "Users manage own sections"
  ON public.workspace_sections
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    AND workspace_id IN (
      SELECT wp.id FROM public.workspace_profiles wp WHERE wp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    AND workspace_id IN (
      SELECT wp.id FROM public.workspace_profiles wp WHERE wp.user_id = auth.uid()
    )
  );

-- 5) Remove broad public listing on shared-meal-plans bucket (files remain accessible by direct public URL)
DROP POLICY IF EXISTS "Public Access to Shared Plans" ON storage.objects;
