-- Fix 1: notifications — drop unrestricted INSERT policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Fix 2: profiles — replace public policy with SECURITY DEFINER check + column-level grants for anon
CREATE OR REPLACE FUNCTION public.is_professional_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('nutritionist'::public.app_role, 'personal'::public.app_role, 'admin'::public.app_role)
  )
$$;

DROP POLICY IF EXISTS "Public can view professional profiles" ON public.profiles;

CREATE POLICY "Public can view professional profiles"
ON public.profiles
FOR SELECT
USING (public.is_professional_user(user_id));

-- Restrict columns exposed to anon (RLS controls rows; column GRANTs control fields).
-- Authenticated users keep full column access — RLS policies still restrict by row.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, user_id, full_name, avatar_url, tenant_id, created_at, updated_at)
  ON public.profiles TO anon;

-- Fix 3: user_roles — drop public enumeration policy.
-- The professional check now flows through is_professional_user() (SECURITY DEFINER),
-- so anon no longer needs direct SELECT on user_roles.
DROP POLICY IF EXISTS "Public can view professional user_roles" ON public.user_roles;