
-- 1. profiles
DROP POLICY IF EXISTS "Public can view professional profiles" ON public.profiles;

CREATE OR REPLACE VIEW public.professional_profiles_public
WITH (security_invoker = on) AS
SELECT
  user_id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles
WHERE public.is_professional_user(user_id);

GRANT SELECT ON public.professional_profiles_public TO anon, authenticated;

CREATE POLICY "Authenticated can view professional profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_professional_user(user_id));

-- 2. invitations
DROP POLICY IF EXISTS "Professionals can manage their own invitations" ON public.invitations;
CREATE POLICY "Professionals can manage their own invitations"
ON public.invitations
FOR ALL
TO authenticated
USING (
  auth.uid() = professional_id
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'admin')
)
WITH CHECK (
  auth.uid() = professional_id
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = 'admin')
);

-- 3. lead_requests
DROP POLICY IF EXISTS "Leads are private" ON public.lead_requests;

-- 4. workspace_sections
DROP POLICY IF EXISTS "Users manage own sections" ON public.workspace_sections;
CREATE POLICY "Users manage own sections"
ON public.workspace_sections
FOR ALL
TO authenticated
USING (
  workspace_id IN (SELECT id FROM public.workspace_profiles WHERE user_id = auth.uid())
)
WITH CHECK (
  workspace_id IN (SELECT id FROM public.workspace_profiles WHERE user_id = auth.uid())
);
