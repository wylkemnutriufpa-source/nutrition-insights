
-- Fix 1: Remove overly permissive policy on patient_clinical_state
DROP POLICY IF EXISTS "Authenticated read clinical state" ON public.patient_clinical_state;

-- Add policy so patients can read only their own clinical state
CREATE POLICY "Patients read own clinical state"
ON public.patient_clinical_state
FOR SELECT
TO authenticated
USING (patient_id = auth.uid());

-- Fix 2: Remove overly permissive policy on global_rules_engine
DROP POLICY IF EXISTS "Admin manage rules" ON public.global_rules_engine;

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Restrict global_rules_engine to admins only
CREATE POLICY "Admins manage global rules"
ON public.global_rules_engine
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()))
