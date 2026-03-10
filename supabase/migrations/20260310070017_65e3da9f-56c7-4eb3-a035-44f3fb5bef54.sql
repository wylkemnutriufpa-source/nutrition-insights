-- FIX 1: CRITICAL - Remove self-insert policy on user_roles (privilege escalation)
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

-- FIX 2: Restrict patient_referrals anon access to lookup by code only
DROP POLICY IF EXISTS "Public read referral by code" ON public.patient_referrals;

-- Create a secure RPC function for referral lookup instead
CREATE OR REPLACE FUNCTION public.lookup_referral_by_code(_code text)
RETURNS TABLE(referral_code text, nutritionist_id uuid, program_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT referral_code, nutritionist_id, program_id
  FROM public.patient_referrals
  WHERE referral_code = _code AND is_active = true
  LIMIT 1
$$;