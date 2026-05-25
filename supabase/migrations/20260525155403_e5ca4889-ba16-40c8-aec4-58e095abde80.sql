-- 1. Fix RLS for profiles: Allow users to view/update their own profile without tenant_id check
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

-- 2. Repair missing user_tenants for existing patients
-- This ensures get_user_tenant() works even if the profile RLS was the only thing blocking them
INSERT INTO public.user_tenants (user_id, tenant_id)
SELECT p.user_id, p.tenant_id
FROM public.profiles p
LEFT JOIN public.user_tenants ut ON p.user_id = ut.user_id
WHERE ut.user_id IS NULL 
AND p.tenant_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;
